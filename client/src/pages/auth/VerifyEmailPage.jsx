import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Mail01Icon,
  RefreshIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { AuthShell } from './LoginPage'
import { verifyEmailApi, resendVerificationApi } from '../../api/auth.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [state, setState] = useState({
    status: token ? 'verifying' : 'no-token', // 'verifying' | 'success' | 'error' | 'no-token'
    message: '',
  })

  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendSuccessMessage, setResendSuccessMessage] = useState('')

  const { notify } = useToast()

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (!token) return

    let active = true
    setState({ status: 'verifying', message: 'Verifying your email address...' })

    verifyEmailApi({ token })
      .then((res) => {
        if (!active) return
        setState({
          status: 'success',
          message: res.message || 'Email verified successfully! You can now log in.',
        })
      })
      .catch((err) => {
        if (!active) return
        setState({
          status: 'error',
          message: apiErrorMessage(err, 'Verification link is invalid or has expired.'),
        })
      })

    return () => {
      active = false
    }
  }, [token])

  const handleResend = async (e) => {
    e.preventDefault()
    if (!resendEmail || !resendEmail.includes('@')) {
      notify('Please enter a valid email address', 'error')
      return
    }

    if (resendCooldown > 0) return

    setResendLoading(true)
    setResendSuccessMessage('')

    try {
      const res = await resendVerificationApi({ email: resendEmail.trim().toLowerCase() })
      setResendSuccessMessage(res.message || 'A new verification link has been sent to your email.')
      notify(res.message || 'Verification link sent', 'success')
      setResendCooldown(60)
    } catch (err) {
      notify(apiErrorMessage(err, 'Unable to send verification link'), 'error')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <AuthShell
      title="Email Verification"
      subtitle="Activate your HEXA digital account securely."
    >
      <div className="space-y-6 text-center">
        {/* ================================================================ */}
        {/* State: Verifying                                                 */}
        {/* ================================================================ */}
        {state.status === 'verifying' && (
          <div className="py-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 animate-pulse">
              <HugeiconsIcon icon={RefreshIcon} size={32} className="animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-[var(--hexa-text)]">Verifying Your Email</h2>
            <p className="text-xs text-[var(--hexa-muted)]">Please wait a moment while we validate your token...</p>
          </div>
        )}

        {/* ================================================================ */}
        {/* State: Success                                                   */}
        {/* ================================================================ */}
        {state.status === 'success' && (
          <div className="py-6 space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={34} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--hexa-text)]">Account Activated!</h2>
              <p className="mt-1.5 text-xs text-emerald-400 font-medium">
                {state.message}
              </p>
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
                <span>Proceed to Sign In</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* State: Error or Expired                                          */}
        {/* ================================================================ */}
        {(state.status === 'error' || state.status === 'no-token') && (
          <div className="py-4 space-y-5 text-left">
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <HugeiconsIcon icon={CancelCircleIcon} size={28} className="shrink-0 text-rose-400" />
              <div>
                <h3 className="text-sm font-bold text-rose-200">
                  {state.status === 'no-token' ? 'Missing Verification Token' : 'Verification Failed'}
                </h3>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  {state.status === 'no-token'
                    ? 'No verification token was provided in the link.'
                    : state.message}
                </p>
              </div>
            </div>

            {/* Resend Verification Box */}
            <div className="rounded-xl bg-[var(--hexa-surface)] border border-[var(--hexa-border)] p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--hexa-text)]">
                <HugeiconsIcon icon={Mail01Icon} size={16} className="text-purple-400" />
                <span>Request a new verification link</span>
              </div>
              <p className="text-[11px] text-[var(--hexa-muted)]">
                Enter your registered email address below to receive a fresh verification link.
              </p>

              {resendSuccessMessage ? (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300 flex items-center gap-2 font-medium">
                  <HugeiconsIcon icon={Tick02Icon} size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{resendSuccessMessage}</span>
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-2.5">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="
                      w-full
                      rounded-lg
                      border
                      border-[var(--hexa-border)]
                      bg-[var(--hexa-card)]
                      px-3
                      py-2
                      text-xs
                      text-[var(--hexa-text)]
                      placeholder:text-[var(--hexa-muted)]
                      focus:border-purple-500
                      focus:outline-none
                    "
                  />
                  <button
                    type="submit"
                    disabled={resendLoading || resendCooldown > 0}
                    className="
                      flex
                      w-full
                      items-center
                      justify-center
                      gap-1.5
                      rounded-lg
                      bg-purple-600
                      py-2.5
                      text-xs
                      font-bold
                      text-white
                      transition
                      hover:bg-purple-500
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                    "
                  >
                    {resendLoading ? (
                      'Sending...'
                    ) : resendCooldown > 0 ? (
                      `Resend available in ${resendCooldown}s`
                    ) : (
                      <>
                        <span>Send Verification Link</span>
                        <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 underline"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
