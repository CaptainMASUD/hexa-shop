import { useEffect, useState } from 'react'

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { HugeiconsIcon } from '@hugeicons/react'

import {
  Alert02Icon,
  ArrowRight01Icon,
  LockPasswordIcon,
  Mail01Icon,
  Tick02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons'

import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { apiErrorMessage } from '../../api/client'
import { resendVerificationApi } from '../../api/auth.api'
import BotShield from '../../components/BotShield'

/* ========================================================================== */
/* Login Page                                                                 */
/* ========================================================================== */

export default function LoginPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState('')

  const { login } = useAuth()
  const { notify } = useToast()

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleResend = async () => {
    const targetEmail = (unverifiedEmail || form.email).trim().toLowerCase()
    if (!targetEmail || resendCooldown > 0 || resendLoading) return
    setResendLoading(true)
    setResendSuccess('')
    try {
      const res = await resendVerificationApi({ email: targetEmail })
      setResendSuccess(res.message || 'Verification link sent!')
      notify(res.message || 'Verification link sent', 'success')
      setResendCooldown(60)
    } catch (err) {
      notify(apiErrorMessage(err, 'Unable to send verification link'), 'error')
    } finally {
      setResendLoading(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()

    if (busy) return

    setBusy(true)
    setUnverifiedEmail('')
    setResendSuccess('')

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      })

      notify('Signed in successfully')

      const from = location.state?.from

      const destination =
        typeof from === 'string'
          ? from
          : from?.pathname || '/account'

      navigate(destination, {
        replace: true,
      })
    } catch (error) {
      const message = apiErrorMessage(error, 'Unable to sign in')
      if (message.toLowerCase().includes('verify your email')) {
        setUnverifiedEmail(form.email.trim())
      }
      notify(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your HEXA account."
    >
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        {/* ================================================================ */}
        {/* Unverified Email Warning & Resend Box                             */}
        {/* ================================================================ */}
        {unverifiedEmail && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 space-y-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <HugeiconsIcon icon={Alert02Icon} size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Email Verification Required</span>
            </div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
              Your email address has not been verified yet. Please check your inbox for the activation link.
            </p>
            {resendSuccess ? (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300 flex items-center gap-1.5 font-medium">
                <HugeiconsIcon icon={Tick02Icon} size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{resendSuccess}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || resendCooldown > 0}
                className="
                  inline-flex items-center gap-1 font-bold text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 underline text-xs disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {resendLoading
                  ? 'Sending link...'
                  : resendCooldown > 0
                  ? `Resend available in ${resendCooldown}s`
                  : 'Resend verification link now →'}
              </button>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* Email                                                            */}
        {/* ================================================================ */}

        <Field
          icon={Mail01Icon}
          label="Email"
        >
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={form.email}
            onChange={(event) =>
              updateField(
                'email',
                event.target.value
              )
            }
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
        </Field>

        {/* ================================================================ */}
        {/* Password                                                         */}
        {/* ================================================================ */}

        <Field
          icon={LockPasswordIcon}
          label="Password"
        >
          <input
            type={
              showPassword
                ? 'text'
                : 'password'
            }
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(event) =>
              updateField(
                'password',
                event.target.value
              )
            }
            placeholder="Enter your password"
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
            onClick={() =>
              setShowPassword(
                (current) => !current
              )
            }
            aria-label={
              showPassword
                ? 'Hide password'
                : 'Show password'
            }
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

              transition-[background-color,color]
              duration-150

              hover:bg-[var(--hexa-bg-soft)]
              hover:text-[var(--hexa-text)]
            "
          >
            <UIIcon
              icon={
                showPassword
                  ? ViewOffSlashIcon
                  : ViewIcon
              }
              size={18}
            />
          </button>
        </Field>

        {/* ================================================================ */}
        {/* Forgot Password                                                  */}
        {/* ================================================================ */}

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="
              text-[12px]
              font-medium
              text-purple-600

              transition-colors
              duration-150

              hover:text-purple-500
            "
          >
            Forgot password?
          </Link>
        </div>

        <BotShield className="mt-4" />

        {/* ================================================================ */}
        {/* Submit                                                           */}
        {/* ================================================================ */}

        <button
          type="submit"
          disabled={busy}
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

              Signing in...
            </>
          ) : (
            <>
              Sign in

              <UIIcon
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

        {/* ================================================================ */}
        {/* Register                                                         */}
        {/* ================================================================ */}

        <p
          className="
            pt-1

            text-center
            text-[13px]
            text-[var(--hexa-muted)]
          "
        >
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="
              font-semibold
              text-purple-600

              transition-colors
              duration-150

              hover:text-purple-500
            "
          >
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

/* ========================================================================== */
/* Auth Shell                                                                 */
/* ========================================================================== */

export function AuthShell({
  title,
  subtitle,
  children,
}) {
  return (
    <main
      className="
        min-h-[calc(100vh-64px)]

        bg-[var(--hexa-bg)]
        text-[var(--hexa-text)]
      "
    >
      <div
        className="
          hexa-container

          flex
          min-h-[calc(100vh-64px)]
          items-center
          justify-center

          py-10
          sm:py-12
        "
      >
        <div
          className="
            w-full
            max-w-[420px]
          "
        >
          {/* ============================================================ */}
          {/* Header                                                       */}
          {/* ============================================================ */}

          <div
            className="
              mb-7
              text-center
            "
          >
            <Link
              to="/"
              className="
                inline-flex
                items-center
                gap-2.5
              "
            >
              <HexaLogo />

              <span
                className="
                  text-[21px]
                  font-black
                  tracking-[-0.035em]
                  text-[var(--hexa-text)]
                "
              >
                HEXA
              </span>
            </Link>

            <h1
              className="
                mt-6

                text-[28px]
                font-bold
                leading-tight
                tracking-[-0.025em]

                text-[var(--hexa-text)]

                sm:text-[30px]
              "
            >
              {title}
            </h1>

            {subtitle && (
              <p
                className="
                  mt-2

                  text-[13px]
                  leading-5

                  text-[var(--hexa-muted)]
                "
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* ============================================================ */}
          {/* Card                                                         */}
          {/* ============================================================ */}

          <div
            className="
              rounded-[18px]

              border
              border-[var(--hexa-border)]

              bg-[var(--hexa-card)]

              p-5
              sm:p-6
            "
          >
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}

/* ========================================================================== */
/* Field                                                                      */
/* ========================================================================== */

function Field({
  icon,
  label,
  children,
}) {
  return (
    <label className="block">
      <span
        className="
          mb-1.5
          block

          text-[12px]
          font-medium

          text-[var(--hexa-text-soft)]
        "
      >
        {label}
      </span>

      <div
        className="
          group
          relative
        "
      >
        <UIIcon
          icon={icon}
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

        {children}
      </div>
    </label>
  )
}

/* ========================================================================== */
/* HEXA Logo                                                                  */
/* ========================================================================== */

function HexaLogo() {
  return (
    <span
      className="
        block

        h-8
        w-8
        shrink-0

        bg-purple-600
      "
      style={{
        clipPath:
          'polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)',
      }}
    />
  )
}

/* ========================================================================== */
/* Hugeicons                                                                  */
/* ========================================================================== */

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
      strokeWidth={strokeWidth}
      className={className}
    />
  )
}