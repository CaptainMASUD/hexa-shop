import {
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

  const { register } = useAuth()
  const { notify } = useToast()

  const navigate = useNavigate()

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
      await register({
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

      notify(
        'Account created successfully'
      )

      navigate(
        '/account',
        {
          replace: true,
        }
      )
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