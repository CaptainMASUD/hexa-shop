import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  HugeiconsIcon,
} from '@hugeicons/react'

import {
  ArrowRight01Icon,
  Call02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Coupon01Icon,
  LockPasswordIcon,
  Mail01Icon,
  Tick02Icon,
  UserCircleIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons'

import {
  AuthShell,
} from './LoginPage'

import {
  useAuth,
} from '../../contexts/AuthContext'

import {
  useToast,
} from '../../contexts/ToastContext'

import {
  apiErrorMessage,
} from '../../api/client'

import { resendVerificationApi } from '../../api/auth.api'
import BotShield from '../../components/BotShield'

/* ========================================================================== */
/* Register Page                                                              */
/* ========================================================================== */

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    referralCode: '',
  })

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [registeredSuccess, setRegisteredSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendSuccess, setResendSuccess] = useState('')

  const { register } = useAuth()
  const { notify } = useToast()

  const navigate = useNavigate()

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  /* ---------------------------------------------------------------------- */
  /* Update field                                                           */
  /* ---------------------------------------------------------------------- */

  const update = (
    key,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))

    if (formError) {
      setFormError('')
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Password validation                                                    */
  /* ---------------------------------------------------------------------- */

  const passwordChecks =
    useMemo(() => {
      const password =
        form.password || ''

      return {
        length:
          password.length >= 8,

        upper:
          /[A-Z]/.test(password),

        lower:
          /[a-z]/.test(password),

        number:
          /\d/.test(password),
      }
    }, [form.password])

  const isPasswordValid =
    Object.values(
      passwordChecks
    ).every(Boolean)

  /* ---------------------------------------------------------------------- */
  /* Resend Verification Handler                                            */
  /* ---------------------------------------------------------------------- */

  const handleResendFromSuccess = async () => {
    if (!registeredEmail || resendCooldown > 0 || resendLoading) return
    setResendLoading(true)
    setResendSuccess('')
    try {
      const res = await resendVerificationApi({ email: registeredEmail })
      setResendSuccess(res.message || 'A new verification link has been sent to your email.')
      notify(res.message || 'Verification link sent', 'success')
      setResendCooldown(60)
    } catch (err) {
      notify(apiErrorMessage(err, 'Unable to resend verification email'), 'error')
    } finally {
      setResendLoading(false)
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Submit                                                                 */
  /* ---------------------------------------------------------------------- */

  const submit = async (
    event
  ) => {
    event.preventDefault()

    if (busy) return

    setFormError('')

    if (!isPasswordValid) {
      setFormError(
        'Please complete all password requirements.'
      )

      return
    }

    setBusy(true)

    try {
      const res = await register({
        name:
          form.name.trim(),

        email:
          form.email.trim(),

        phone:
          form.phone.trim(),

        password:
          form.password,

        referralCode:
          form.referralCode
            .trim()
            .toUpperCase(),
      })

      if (res?.data?.requiresVerification) {
        setRegisteredEmail(form.email.trim().toLowerCase())
        setRegisteredSuccess(true)
        setResendCooldown(60)
        notify('Account created! Please check your email to verify.', 'success')
      } else {
        notify('Account created successfully')
        navigate('/account', { replace: true })
      }
    } catch (error) {
      const message =
        apiErrorMessage(
          error,
          'Unable to create account'
        )

      setFormError(message)

      notify(
        message,
        'error'
      )
    } finally {
      setBusy(false)
    }
  }

  if (registeredSuccess) {
    return (
      <AuthShell
        title="Check Your Inbox"
        subtitle="We have sent a verification link to your email."
      >
        <div className="py-2 space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <HugeiconsIcon icon={Mail01Icon} size={32} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-[var(--hexa-text)]">Verify Your Email Address</h2>
            <p className="text-xs text-[var(--hexa-muted)]">
              We sent a verification link to <strong className="text-[var(--hexa-text)]">{registeredEmail}</strong>. Please verify your email before logging in.
            </p>
          </div>

          <div className="rounded-xl bg-[var(--hexa-surface)] border border-[var(--hexa-border)] p-4 text-xs text-left space-y-2">
            <p className="font-semibold text-[var(--hexa-text)] flex items-center gap-1.5">
              <span>⏱️ Note:</span>
            </p>
            <p className="text-[11px] text-[var(--hexa-muted)]">
              The verification link will expire in 30 minutes. If you don't see the email, check your spam or junk folder.
            </p>

            {resendSuccess ? (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300 flex items-center gap-1.5 font-medium">
                <HugeiconsIcon icon={Tick02Icon} size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{resendSuccess}</span>
              </div>
            ) : (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResendFromSuccess}
                  disabled={resendLoading || resendCooldown > 0}
                  className="
                    w-full
                    rounded-lg
                    border
                    border-purple-500/30
                    bg-purple-500/10
                    py-2
                    text-xs
                    font-semibold
                    text-purple-300
                    hover:bg-purple-500/20
                    transition
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  {resendLoading
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend email in ${resendCooldown}s`
                    : 'Resend Verification Email'}
                </button>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Link
              to="/login"
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-purple-600
                py-3
                text-sm
                font-bold
                text-white
                shadow-lg
                shadow-purple-600/25
                transition
                hover:bg-purple-500
              "
            >
              <span>Go to Sign In</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
            </Link>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Create your HEXA account to get started."
    >
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        {/* ================================================================ */}
        {/* Error                                                            */}
        {/* ================================================================ */}

        {formError && (
          <div
            role="alert"
            className="
              flex
              items-start
              gap-2.5

              rounded-xl

              border
              border-rose-500/30

              px-3
              py-2.5

              text-[12px]
              leading-5
              text-rose-500
            "
          >
            <UIIcon
              icon={
                CancelCircleIcon
              }
              size={17}
              strokeWidth={1.8}
              className="
                mt-[1px]
                shrink-0
              "
            />

            <span>
              {formError}
            </span>
          </div>
        )}

        {/* ================================================================ */}
        {/* Full Name                                                        */}
        {/* ================================================================ */}

        <Field
          icon={
            UserCircleIcon
          }
          label="Full name"
        >
          <input
            required
            autoComplete="name"
            value={form.name}
            onChange={(
              event
            ) =>
              update(
                'name',
                event.target.value
              )
            }
            placeholder="John Doe"
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
        {/* Email                                                            */}
        {/* ================================================================ */}

        <Field
          icon={Mail01Icon}
          label="Email"
        >
          <input
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={(
              event
            ) =>
              update(
                'email',
                event.target.value
              )
            }
            placeholder="john@example.com"
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
        {/* Phone                                                            */}
        {/* ================================================================ */}

        <Field
          icon={Call02Icon}
          label="Phone"
          optional
        >
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(
              event
            ) =>
              update(
                'phone',
                event.target.value
              )
            }
            placeholder="01XXXXXXXXX"
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
        {/* Referral Code                                                    */}
        {/* ================================================================ */}

        <Field
          icon={Coupon01Icon}
          label="Referral code"
          optional
        >
          <input
            value={
              form.referralCode
            }
            onChange={(
              event
            ) =>
              update(
                'referralCode',
                event.target.value
              )
            }
            placeholder="HEXA-REF"
            spellCheck={false}
            className="
              hexa-input

              !h-11
              !rounded-xl
              !pl-11
              !pr-4

              uppercase

              text-[14px]
              font-normal
              tracking-[0.02em]

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
          icon={
            LockPasswordIcon
          }
          label="Password"
        >
          <input
            required
            type={
              showPassword
                ? 'text'
                : 'password'
            }
            autoComplete="new-password"
            value={
              form.password
            }
            onChange={(
              event
            ) =>
              update(
                'password',
                event.target.value
              )
            }
            placeholder="Create a password"
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
                (current) =>
                  !current
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
        {/* Password Requirements                                            */}
        {/* ================================================================ */}

        {form.password.length >
          0 && (
          <PasswordRequirements
            checks={
              passwordChecks
            }
          />
        )}

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

              Creating account...
            </>
          ) : (
            <>
              Create account

              <UIIcon
                icon={
                  ArrowRight01Icon
                }
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
        {/* Login                                                            */}
        {/* ================================================================ */}

        <p
          className="
            pt-1

            text-center

            text-[13px]
            text-[var(--hexa-muted)]
          "
        >
          Already have an account?{' '}
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

/* ========================================================================== */
/* Field                                                                      */
/* ========================================================================== */

function Field({
  icon,
  label,
  optional = false,
  children,
}) {
  return (
    <label className="block">
      <span
        className="
          mb-1.5

          flex
          items-center
          gap-1.5

          text-[12px]
          font-medium

          text-[var(--hexa-text-soft)]
        "
      >
        <span>
          {label}
        </span>

        {optional && (
          <span
            className="
              text-[10px]
              font-normal
              text-[var(--hexa-muted)]
            "
          >
            Optional
          </span>
        )}
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
/* Password Requirements                                                      */
/* ========================================================================== */

function PasswordRequirements({
  checks,
}) {
  return (
    <div
      className="
        rounded-xl

        border
        border-[var(--hexa-border)]

        px-3
        py-3
      "
    >
      <p
        className="
          text-[11px]
          font-medium

          text-[var(--hexa-muted)]
        "
      >
        Password requirements
      </p>

      <div
        className="
          mt-2.5

          grid
          grid-cols-2
          gap-x-3
          gap-y-2
        "
      >
        <Requirement
          passed={
            checks.length
          }
        >
          8+ characters
        </Requirement>

        <Requirement
          passed={
            checks.upper
          }
        >
          Uppercase letter
        </Requirement>

        <Requirement
          passed={
            checks.lower
          }
        >
          Lowercase letter
        </Requirement>

        <Requirement
          passed={
            checks.number
          }
        >
          Number
        </Requirement>
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Requirement                                                                */
/* ========================================================================== */

function Requirement({
  passed,
  children,
}) {
  return (
    <div
      className={`
        flex
        min-w-0
        items-center
        gap-1.5

        text-[11px]
        leading-4

        transition-colors
        duration-150

        ${
          passed
            ? `
              font-medium
              text-emerald-500
            `
            : `
              font-normal
              text-[var(--hexa-muted)]
            `
        }
      `}
    >
      <UIIcon
        icon={
          passed
            ? CheckmarkCircle02Icon
            : CancelCircleIcon
        }
        size={14}
        strokeWidth={1.8}
        className="shrink-0"
      />

      <span>
        {children}
      </span>
    </div>
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
      strokeWidth={
        strokeWidth
      }
      className={
        className
      }
    />
  )
}