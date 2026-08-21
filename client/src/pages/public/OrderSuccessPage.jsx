import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  FaArrowRight,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaGift,
  FaReceipt,
  FaShoppingBag,
  FaUser,
} from 'react-icons/fa'
import { getMyOrder } from '../../api/order.api'
import { apiErrorMessage } from '../../api/client'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useCart } from '../../contexts/CartContext'
import StatusBadge from '../../components/StatusBadge'

export default function OrderSuccessPage() {
  const { id } = useParams()
  const location = useLocation()
  const { clearCart } = useCart()
  const currencyContext = useCurrency()
  const format = currencyContext?.format || ((v) => `৳${Number(v || 0).toLocaleString()}`)

  const [order, setOrder] = useState(() => location.state?.order || null)
  const [loading, setLoading] = useState(() => !location.state?.order)
  const [error, setError] = useState('')

  useEffect(() => {
    clearCart()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (id) {
      getMyOrder(id)
        .then((data) => {
          if (data) setOrder(data)
        })
        .catch((err) => {
          // If we already have state from navigation, don't show an error screen
          if (!order) {
            setError(apiErrorMessage(err, 'Unable to load order details'))
          }
        })
        .finally(() => setLoading(false))
    }
  }, [id])

  const printReceipt = () => {
    window.print()
  }

  if (loading && !order) {
    return (
      <div className="hexa-container py-24 text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--hexa-muted)]">Loading order confirmation...</p>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="hexa-container py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 text-2xl font-bold">
          !
        </div>
        <h1 className="mt-4 text-2xl font-bold">Order Details Unavailable</h1>
        <p className="mt-2 text-sm text-[var(--hexa-muted)]">{error || 'Could not find order.'}</p>
        <Link to="/account/orders" className="hexa-btn mt-6 inline-flex">
          Go to My Orders
        </Link>
      </div>
    )
  }

  const bundleSavings = (order?.bundles || []).reduce(
    (sum, bundle) => sum + Number(bundle?.savings || 0),
    0,
  )

  const items = order?.items || []

  return (
    <div className="hexa-container py-12">
      {/* Celebration Header */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-8 ring-emerald-500/10 animate-bounce">
          <FaCheck className="text-3xl" />
        </div>
        <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
          <FaCheckCircle /> Order Successfully Placed
        </span>
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-[var(--hexa-text)]">
          Thank you for your order!
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[var(--hexa-muted)]">
          Your order{' '}
          <strong className="text-[var(--hexa-text)] font-mono">
            {order?.orderNumber || `#${String(id).slice(-8).toUpperCase()}`}
          </strong>{' '}
          has been received and recorded in your account.
        </p>
      </div>

      <div className="mt-10 mx-auto max-w-4xl grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* 1. Payment Verification Card */}
          <div className="hexa-card p-6 border-purple-500/30 bg-purple-500/[0.04]">
            <div className="flex items-center justify-between border-b border-[var(--hexa-border)]/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                  <FaCreditCard className="text-lg" />
                </div>
                <div>
                  <h2 className="font-bold text-[var(--hexa-text)]">Payment Details</h2>
                  <p className="text-xs text-[var(--hexa-muted)]">
                    Submitted for verification
                  </p>
                </div>
              </div>
              <StatusBadge value={order?.payment?.status || 'pending'} />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-[var(--hexa-muted)]">Payment Method</p>
                <p className="font-semibold text-[var(--hexa-text)] mt-0.5">
                  {order?.payment?.methodName || 'Mobile Banking'}
                </p>
              </div>

              {order?.payment?.paymentAccountNumber && (
                <div>
                  <p className="text-xs text-[var(--hexa-muted)]">Recipient Account</p>
                  <p className="font-mono font-bold text-purple-400 mt-0.5">
                    {order.payment.paymentAccountNumber}
                    {order.payment.accountType ? ` (${order.payment.accountType})` : ''}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-[var(--hexa-muted)]">Your Sender Number</p>
                <p className="font-mono font-semibold text-[var(--hexa-text)] mt-0.5">
                  {order?.payment?.senderNumber || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-[var(--hexa-muted)]">Transaction ID (TrxID)</p>
                <p className="font-mono font-bold text-purple-300 mt-0.5">
                  {order?.payment?.transactionId || '—'}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-purple-500/10 border border-purple-500/20 p-3.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--hexa-muted)]">Total Paid:</span>
              <span className="text-xl font-black text-purple-300">
                {format(order?.total || 0)}
              </span>
            </div>
          </div>

          {/* 2. Purchased Items Summary */}
          <div className="hexa-card p-6">
            <h2 className="font-bold text-lg text-[var(--hexa-text)] flex items-center gap-2">
              <FaShoppingBag className="text-purple-400" /> Purchased Items
            </h2>

            <div className="mt-4 divide-y divide-[var(--hexa-border)]/50">
              {items.map((item, idx) => (
                <div key={item._id || idx} className="py-3.5 flex justify-between gap-4 text-sm first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover bg-white/5 border border-[var(--hexa-border)]"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 font-bold">
                        {(item.productName || 'IT').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[var(--hexa-text)]">{item.productName}</p>
                        {item.itemType === 'bundle' && (
                          <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-400 flex items-center gap-1">
                            <FaGift className="text-[9px]" /> Bundle
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--hexa-muted)] mt-0.5">
                        {item.variantName || item.productType} × {item.quantity}
                      </p>
                      {item.customerInputs && Object.keys(item.customerInputs).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Object.entries(item.customerInputs).filter(([_, v]) => v).map(([k, v]) => (
                            <span key={k} className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400">
                              <span className="capitalize text-[var(--hexa-muted)]">{k.replace(/([A-Z])/g, ' $1')}:</span> {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-[var(--hexa-text)]">
                    {format((item.price || 0) * (item.quantity || 1))}
                  </span>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="mt-5 border-t border-[var(--hexa-border)] pt-4 space-y-2 text-sm text-[var(--hexa-muted)]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{format(order?.subtotal || 0)}</span>
              </div>
              {bundleSavings > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Bundle savings</span>
                  <span>-{format(bundleSavings)}</span>
                </div>
              )}
              {Number(order?.promotion?.discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Promotion discount</span>
                  <span>-{format(order.promotion.discount)}</span>
                </div>
              )}
              {Number(order?.coupon?.discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Coupon ({order.coupon.code})</span>
                  <span>-{format(order.coupon.discount)}</span>
                </div>
              )}
              {Number(order?.walletApplied || 0) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Wallet applied</span>
                  <span>-{format(order.walletApplied)}</span>
                </div>
              )}
              {Number(order?.loyaltyPointsRedeemed || 0) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Loyalty points</span>
                  <span>{order.loyaltyPointsRedeemed} pts</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--hexa-border)] pt-3 text-lg font-black text-[var(--hexa-text)]">
                <span>Total Amount</span>
                <span className="text-purple-300">{format(order?.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Next Steps & Actions */}
        <div className="space-y-6">
          {/* Order Progress / What happens next */}
          <div className="hexa-card p-6">
            <h2 className="font-bold text-base text-[var(--hexa-text)]">Order Progress</h2>
            <p className="mt-1 text-xs text-[var(--hexa-muted)]">
              Real-time fulfillment tracker
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold shadow">
                  <FaCheck className="text-[10px]" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[var(--hexa-text)]">
                    1. Payment Submitted
                  </p>
                  <p className="text-[11px] text-[var(--hexa-muted)]">
                    Transaction reference received
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-xs font-bold shadow animate-pulse">
                  <FaClock className="text-[10px]" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-purple-300">
                    2. Payment Verification (In Progress)
                  </p>
                  <p className="text-[11px] text-[var(--hexa-muted)]">
                    Admin is reviewing your transaction
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 opacity-60">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-700 text-gray-400 text-xs font-bold">
                  3
                </span>
                <div>
                  <p className="text-xs font-semibold text-[var(--hexa-text)]">
                    3. Digital Delivery
                  </p>
                  <p className="text-[11px] text-[var(--hexa-muted)]">
                    Credentials unlock in your account
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {order?._id && (
              <Link
                to={`/account/orders/${order._id}`}
                className="hexa-btn w-full justify-center text-sm py-3"
              >
                <FaUser /> View in My Account / Orders
              </Link>
            )}

            <button
              type="button"
              onClick={printReceipt}
              className="hexa-btn-secondary w-full justify-center text-sm py-2.5"
            >
              <FaReceipt /> Print / Download Receipt
            </button>

            <Link
              to="/products"
              className="flex items-center justify-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 pt-2 transition"
            >
              Continue Shopping <FaArrowRight className="text-[10px]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
