import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  Mail01Icon,
  Tick02Icon,
  Alert02Icon,
} from '@hugeicons/core-free-icons'
import { AuthShell } from './LoginPage'
import { forgotPasswordApi } from '../../api/auth.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import BotShield from '../../components/BotShield'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const { notify } = useToast()

  // 60-second cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const submit = async (event) => {
    event.preventDefault()
    if (busy || cooldown > 0) return

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return

    setBusy(true)
    setSubmitted(false)
    setSuccessMessage('')

    try {
      const res = await forgotPasswordApi({ email: cleanEmail })
      const message =
        res.message ||
        'If an account exists for this email, a password reset link has been sent.'
      setSuccessMessage(message)
      setSubmitted(true)
      setCooldown(60)
      notify('Password reset link sent', 'success')
    } catch (error) {
      notify(apiErrorMessage(error, 'Unable to send password reset email'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your account email to receive a secure password reset link."
    >
      <form onSubmit={submit} className="space-y-4">
        {/* Success / Instructions Banner */}
        {submitted && successMessage && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-xs p-4 space-y-2 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-200">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
              <HugeiconsIcon icon={Tick02Icon} size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Check Your Inbox</span>
            </div>
            <p className="text-[12px] font-medium text-emerald-800/95 dark:text-emerald-200/90 leading-relaxed">
              {successMessage}
            </p>
            <p className="text-[11px] text-emerald-700/85 dark:text-emerald-300/80">
              Please check your spam or promotions folder if you do not see the email within a few minutes.
            </p>
          </div>
        )}

        {/* Email Field */}
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--hexa-text-soft)]">
            Registered Email
          </span>
          <div className="group relative">
            <HugeiconsIcon
              icon={Mail01Icon}
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
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="
                hexa-input
                !h-11
                !rounded-xl
                !pl-11
                !pr-4
                text-[14px]
                font-normal
                transition-[border-color,box-shadow]
                duration-150
                ease-out
                focus:!border-purple-500/50
                focus:!shadow-[0_0_0_3px_rgba(147,51,234,0.07)]
              "
            />
          </div>
        </label>

        <BotShield className="mt-4" />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy || cooldown > 0}
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
              Sending reset link...
            </>
          ) : cooldown > 0 ? (
            `Resend available in ${cooldown}s`
          ) : (
            <>
              Send reset link
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
          Remember your password?{' '}
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
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
