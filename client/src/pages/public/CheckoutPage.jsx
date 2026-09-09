import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  FaCheck,
  FaCheckCircle,
  FaCopy,
  FaCreditCard,
  FaGift,
  FaInfoCircle,
  FaLock,
  FaQrcode,
  FaWallet,
} from 'react-icons/fa'
import { getPaymentMethods } from '../../api/catalog.api'
import { createOrder } from '../../api/order.api'
import { getCheckoutQuote, getWallet } from '../../api/features.api'
import { apiErrorMessage } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { useToast } from '../../contexts/ToastContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import Modal from '../../components/Modal'
import BotShield from '../../components/BotShield'

const toApiCartItem = (item) =>
  item.itemType === 'bundle'
    ? { itemType: 'bundle', bundleId: item.bundleId, quantity: item.quantity, customerInputs: item.customerInputs || {} }
    : {
        itemType: 'product',
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        customerInputs: item.customerInputs || {},
      }

export default function CheckoutPage() {
  const { user } = useAuth()
  const { items, subtotal, clearCart } = useCart()
  const { notify } = useToast()
  const { format } = useCurrency()
  const navigate = useNavigate()

  const [methods, setMethods] = useState([])
  const [methodId, setMethodId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [wallet, setWallet] = useState(null)
  const [couponCode, setCouponCode] = useState('')
  const [walletAmount, setWalletAmount] = useState(0)
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [copiedNumber, setCopiedNumber] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [purchaseState, setPurchaseState] = useState('idle') // 'idle' | 'processing' | 'confirmed'
  const [statusMessage, setStatusMessage] = useState('')

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    senderNumber: '',
    transactionId: '',
  })

  useEffect(() => {
    Promise.all([getPaymentMethods(), getWallet()])
      .then(([paymentMethods, walletData]) => {
        setMethods(paymentMethods || [])
        setWallet(walletData || null)
        if (paymentMethods?.[0]) setMethodId(paymentMethods[0]._id)
      })
      .catch(() => {})
  }, [])

  const method = useMemo(
    () => methods.find((entry) => entry._id === methodId) || null,
    [methods, methodId],
  )
  const requestItems = useMemo(() => items.map(toApiCartItem), [items])

  useEffect(() => {
    if (!methodId || !items.length) return undefined

    const id = setTimeout(() => {
      getCheckoutQuote({
        items: requestItems,
        customer: {
          name: form.name || user?.name || 'Customer',
          email: form.email || user?.email || '',
          phone: form.phone || user?.phone || '00000',
        },
        paymentMethodId: methodId,
        couponCode: couponCode.trim(),
        walletAmount: Number(walletAmount || 0),
        loyaltyPoints: Number(loyaltyPoints || 0),
      })
        .then((data) => {
          setQuote(data)
          setQuoteError('')
        })
        .catch((error) => {
          setQuote(null)
          setQuoteError(apiErrorMessage(error, 'Unable to calculate checkout'))
        })
    }, 300)

    return () => clearTimeout(id)
  }, [
    methodId,
    couponCode,
    walletAmount,
    loyaltyPoints,
    requestItems,
    items.length,
    form.name,
    form.email,
    form.phone,
    user,
  ])

  if (!items.length && purchaseState === 'idle' && !submitting) {
    return <Navigate to="/cart" replace />
  }

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }))

  const copyAccountNumber = async () => {
    if (!method?.accountNumber) return
    try {
      await navigator.clipboard.writeText(method.accountNumber)
      setCopiedNumber(true)
      notify('Account number copied to clipboard')
      setTimeout(() => setCopiedNumber(false), 2500)
    } catch {
      notify('Could not copy automatically', 'info')
    }
  }

  const payableAmount = quote?.total ?? subtotal
  const isFullyPaid = payableAmount === 0

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setPurchaseState('processing')
    setStatusMessage('Securing digital inventory reservation...')

    try {
      // Smooth visual progression
      await new Promise((r) => setTimeout(r, 450))
      setStatusMessage('Registering order & payment details...')

      const response = await createOrder({
        items: requestItems,
        customer: { name: form.name, email: form.email, phone: form.phone },
        paymentMethodId: methodId,
        senderNumber: isFullyPaid
          ? 'WALLET'
          : form.senderNumber || 'WALLET',
        transactionId: isFullyPaid
          ? `WALLET-${Date.now()}`
          : form.transactionId || `HEXA-${Date.now()}`,
        couponCode: couponCode.trim(),
        walletAmount: Number(walletAmount || 0),
        loyaltyPoints: Number(loyaltyPoints || 0),
      })

      const order = response.order || response

      setStatusMessage('Order confirmed! Redirecting...')
      setPurchaseState('confirmed')

      // Give 1.1s for user to see the success checkmark animation
      await new Promise((r) => setTimeout(r, 1100))
      clearCart()
      navigate(`/order-success/${order._id}`, { state: { order }, replace: true })
    } catch (error) {
      setPurchaseState('idle')
      setSubmitting(false)
      notify(apiErrorMessage(error, 'Unable to place order'), 'error')
    }
  }

  const bundleSavings = (quote?.bundles || []).reduce(
    (sum, bundle) => sum + Number(bundle.savings || 0),
    0,
  )

  const isManual =
    method &&
    method.gatewayType !== 'external' &&
    method.gatewayType !== 'wallet'

  return (
    <div className="hexa-container py-12">
      <span className="hexa-badge">
        <FaLock />Secure checkout
      </span>
      <h1 className="hexa-title mt-4">Complete your purchase</h1>
      <p className="mt-3 max-w-3xl text-[var(--hexa-muted)]">
        Select your preferred payment method, send payment to the official account number, and submit your transaction reference.
      </p>

      <form
        onSubmit={submit}
        className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]"
      >
        <div className="space-y-6">
          {/* 1. Customer Info */}
          <Section number="1" title="Customer information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input
                  required
                  autoComplete="name"
                  className="hexa-input"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  autoComplete="email"
                  className="hexa-input"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  className="hexa-input"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </Field>
            </div>
          </Section>

          {/* 2. Payment Method Selector (ONLY Logo & Method Name, clean as original) */}
          <Section number="2" title="Select payment method">
            {methods.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {methods.map((item) => {
                  const isSelected = methodId === item._id
                  return (
                    <button
                      type="button"
                      key={item._id}
                      onClick={() => setMethodId(item._id)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/[0.08] ring-2 ring-purple-500/20'
                          : 'border-[var(--hexa-border)] bg-[var(--hexa-card)] hover:border-purple-500/30 hover:bg-[var(--hexa-surface)]/50'
                      }`}
                    >
                      {item.logo?.url ? (
                        <img
                          src={item.logo.url}
                          alt={item.name}
                          className="h-10 w-10 shrink-0 rounded-lg object-contain bg-white/5 p-1"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                          <FaCreditCard className="text-lg" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-[var(--hexa-text)]">{item.name}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-rose-500">No active payment method is configured.</p>
            )}
          </Section>

          {/* 3. Discounts & HEXA Rewards */}
          <Section number="3" title="Discounts & HEXA rewards">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Coupon code">
                <div className="relative">
                  <FaGift className="absolute left-3 top-3.5 text-purple-400" />
                  <input
                    className="hexa-input !pl-10 uppercase font-mono"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="HEXA10"
                  />
                </div>
              </Field>
              <Field label={`Wallet balance: ${format(Number(wallet?.walletBalance || 0))}`}>
                <div className="relative">
                  <FaWallet className="absolute left-3 top-3.5 text-purple-400" />
                  <input
                    type="number"
                    min="0"
                    max={wallet?.walletBalance || 0}
                    className="hexa-input !pl-10 font-mono"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="Amount in BDT"
                  />
                </div>
              </Field>
              <Field label={`Loyalty points: ${wallet?.loyaltyPoints || 0} pts`}>
                <input
                  type="number"
                  min="0"
                  max={wallet?.loyaltyPoints || 0}
                  className="hexa-input font-mono"
                  value={loyaltyPoints}
                  onChange={(e) => setLoyaltyPoints(e.target.value)}
                  placeholder="Redeem points"
                />
              </Field>
            </div>
            {quoteError && (
              <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-sm text-rose-400 flex items-center gap-2">
                <FaInfoCircle /> {quoteError}
              </p>
            )}
          </Section>

          {/* 4. Payment Details & Separate Instructions */}
          {method && (
            <Section number="4" title={`Payment details for ${method.name}`}>
              {method.gatewayType === 'external' ? (
                <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-5 text-sm text-[var(--hexa-muted)] leading-6">
                  <p className="font-semibold text-[var(--hexa-text)]">External Payment Gateway</p>
                  <p className="mt-1">
                    {method.instructions ||
                      'You will be redirected to the secure payment provider to complete your payment.'}
                  </p>
                </div>
              ) : method.gatewayType === 'wallet' ? (
                <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-5 text-sm text-[var(--hexa-muted)] leading-6">
                  <p className="font-semibold text-[var(--hexa-text)]">HEXA Store Credit / Wallet</p>
                  <p className="mt-1">
                    {method.instructions ||
                      'The payable amount will be deducted directly from your verified HEXA account balance.'}
                  </p>
                </div>
              ) : (
                /* Manual / Direct Mobile Banking (bKash / Nagad / Rocket / Bank) */
                <div className="space-y-4">
                  <div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.06] p-5 sm:p-6 shadow-sm">
                    {/* Header with Account Number & Copy button */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs uppercase tracking-wider font-semibold text-purple-400">
                            Send Money to Recipient Number
                          </span>
                          {method.accountType && (
                            <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-[11px] font-semibold text-purple-300">
                              {method.accountType}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <span className="font-mono text-2xl sm:text-3xl font-black tracking-wide text-[var(--hexa-text)]">
                            {method.accountNumber || '—'}
                          </span>
                          {method.accountNumber && (
                            <button
                              type="button"
                              onClick={copyAccountNumber}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                copiedNumber
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                              }`}
                            >
                              {copiedNumber ? <><FaCheck /> Copied</> : <><FaCopy /> Copy Number</>}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* QR Code thumbnail if available */}
                      {method.qrCode?.url && (
                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={() => setQrModalOpen(true)}
                            className="group flex flex-col items-center gap-1 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-2 hover:border-purple-500/50 transition"
                          >
                            <img
                              src={method.qrCode.url}
                              alt="Scan QR"
                              className="h-16 w-16 rounded-lg object-contain bg-white"
                            />
                            <span className="flex items-center gap-1 text-[10px] font-medium text-purple-300 group-hover:underline">
                              <FaQrcode /> Scan QR
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Metadata: Account Name, Branch, Charge Note */}
                    {(method.accountName || method.branchName || method.chargeNote) && (
                      <div className="mt-4 pt-4 border-t border-purple-500/15 grid gap-2 sm:grid-cols-2 text-xs text-[var(--hexa-muted)]">
                        {method.accountName && (
                          <p>
                            <strong className="text-[var(--hexa-text)]">Account Name:</strong>{' '}
                            {method.accountName}
                          </p>
                        )}
                        {method.branchName && (
                          <p>
                            <strong className="text-[var(--hexa-text)]">Branch / Network:</strong>{' '}
                            {method.branchName}
                          </p>
                        )}
                        {method.chargeNote && (
                          <p className="sm:col-span-2 text-purple-300 font-medium">
                            <strong className="text-[var(--hexa-text)]">Note:</strong> {method.chargeNote}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Exact amount to send banner */}
                    <div className="mt-4 rounded-xl bg-purple-500/10 border border-purple-500/20 p-3.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--hexa-muted)]">
                        Exact Amount to Send:
                      </span>
                      <span className="text-xl font-black text-purple-300">
                        {format(payableAmount)}
                      </span>
                    </div>

                    {/* Instructions - each line rendered as an individual distinct step */}
                    {method.instructions && (
                      <div className="mt-5 rounded-xl bg-[var(--hexa-surface)] border border-[var(--hexa-border)] p-4 sm:p-5">
                        <p className="font-semibold text-sm text-[var(--hexa-text)] mb-3 flex items-center gap-2">
                          <FaInfoCircle className="text-purple-400" /> Payment Instructions:
                        </p>
                        <div className="space-y-2.5">
                          {method.instructions
                            .split(/\r?\n/)
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line, idx) => {
                              const match = line.match(/^(\d+)[.)]\s*(.*)$/)
                              return (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 text-xs sm:text-sm leading-relaxed"
                                >
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-[11px] font-bold text-purple-300">
                                    {match ? match[1] : idx + 1}
                                  </span>
                                  <span className="flex-1 text-[var(--hexa-text)]">
                                    {match ? match[2] : line}
                                  </span>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* 5. Transaction Confirmation */}
          {isManual && (
            <Section number="5" title="Transaction details">
              {isFullyPaid ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] p-4 text-sm text-emerald-300 flex items-center gap-2.5">
                  <FaCheckCircle className="text-base shrink-0" />
                  <span>
                    Your order total is ৳0 (100% covered by wallet or loyalty rewards). No sender number or transaction ID is required.
                  </span>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sender Number">
                    <input
                      required
                      type="tel"
                      className="hexa-input text-sm"
                      value={form.senderNumber}
                      onChange={(e) => update('senderNumber', e.target.value)}
                      placeholder="01XXXXXXXXX"
                    />
                  </Field>
                  <Field label="Transaction ID (TrxID)">
                    <input
                      required
                      className="hexa-input uppercase text-sm"
                      value={form.transactionId}
                      onChange={(e) => update('transactionId', e.target.value)}
                      placeholder="e.g. 9J4K2L88X"
                    />
                  </Field>
                </div>
              )}
            </Section>
          )}
        </div>

        {/* Right Sticky Sidebar: Order Summary */}
        <aside className="hexa-card h-fit p-6 lg:sticky lg:top-28">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="mt-5 space-y-4 max-h-[340px] overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.key} className="flex justify-between gap-4 text-sm border-b border-[var(--hexa-border)]/40 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--hexa-text)]">{item.name}</p>
                    {item.itemType === 'bundle' && (
                      <span className="rounded-full bg-purple-500/[0.09] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-400">
                        Bundle
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--hexa-muted)]">
                    {item.itemType === 'bundle'
                      ? `${item.components?.length || 0} included items`
                      : item.variantName || item.productType}{' '}
                    × {item.quantity}
                  </p>
                  {item.customerInputs && Object.keys(item.customerInputs).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Object.entries(item.customerInputs).filter(([, v]) => v).map(([k, v]) => (
                        <span key={k} className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400">
                          <span className="capitalize text-[var(--hexa-muted)]">{k.replace(/([A-Z])/g, ' $1')}:</span> {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="font-medium">{format(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2 border-t border-[var(--hexa-border)] pt-5 text-sm">
            <Summary label="Subtotal" value={format(quote?.subtotal ?? subtotal)} />
            {bundleSavings > 0 && (
              <Summary label="Bundle combo savings" value={`-${format(bundleSavings)}`} positive />
            )}
            {quote?.promotion?.discount > 0 && (
              <Summary
                label={`Campaign${
                  quote.promotion.campaigns?.length
                    ? `: ${quote.promotion.campaigns.map((item) => item.name).join(', ')}`
                    : ''
                }`}
                value={`-${format(quote.promotion.discount)}`}
                positive
              />
            )}
            {quote?.coupon?.discount > 0 && (
              <Summary
                label={`Coupon (${quote.coupon.code})`}
                value={`-${format(quote.coupon.discount)}`}
                positive
              />
            )}
            {quote?.walletApplied > 0 && (
              <Summary label="Wallet credit applied" value={`-${format(quote.walletApplied)}`} positive />
            )}
            {quote?.loyaltyPointsRedeemed > 0 && (
              <Summary
                label="Points redeemed"
                value={`${quote.loyaltyPointsRedeemed} pts`}
                positive
              />
            )}
            <div className="mt-4 flex justify-between border-t border-[var(--hexa-border)] pt-4 text-xl font-black">
              <span>Payable</span>
              <span className="text-purple-300">{format(payableAmount)}</span>
            </div>
          </div>

          <BotShield className="mt-4" />

          <button
            disabled={submitting || !methodId || Boolean(quoteError)}
            className="hexa-btn mt-4 w-full"
          >
            <FaCheckCircle />
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
          <p className="mt-4 text-xs leading-5 text-[var(--hexa-muted)] text-center">
            Digital deliveries appear securely in your account once payment is verified.
          </p>
        </aside>
      </form>

      {/* QR Code Zoom Modal */}
      {method?.qrCode?.url && (
        <Modal
          open={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          title={`${method.name} Payment QR`}
        >
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <img
              src={method.qrCode.url}
              alt="Scan to Pay"
              className="max-h-80 rounded-2xl border border-[var(--hexa-border)] bg-white p-3 shadow-lg"
            />
            <p className="mt-4 font-mono font-bold text-2xl text-[var(--hexa-text)]">
              {method.accountNumber}
            </p>
            <p className="text-xs font-semibold text-purple-400 mt-1">
              {method.accountType} {method.accountName ? `· ${method.accountName}` : ''}
            </p>
            <p className="mt-3 text-xs text-[var(--hexa-muted)] max-w-sm">
              Scan this QR code from your {method.name} mobile app to make payment.
            </p>
          </div>
        </Modal>
      )}

      {/* Animated Purchase Processing Modal Overlay */}
      {purchaseState !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="hexa-card max-w-md w-full p-8 text-center border-purple-500/40 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-purple-600/20 blur-3xl" />
            <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-emerald-600/20 blur-3xl" />

            <div className="relative z-10">
              {purchaseState === 'processing' ? (
                <div className="flex flex-col items-center">
                  <div className="relative flex h-24 w-24 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
                      <FaLock className="text-2xl animate-pulse" />
                    </div>
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-[var(--hexa-text)]">
                    Completing Purchase...
                  </h3>
                  <p className="mt-2 text-sm text-[var(--hexa-muted)] min-h-[20px] transition-all">
                    {statusMessage}
                  </p>
                  <div className="mt-6 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10 animate-bounce">
                    <FaCheck className="text-4xl" />
                  </div>
                  <h3 className="mt-6 text-2xl font-black text-[var(--hexa-text)]">
                    Purchase Successful!
                  </h3>
                  <p className="mt-2 text-sm text-emerald-400 font-medium">
                    {statusMessage}
                  </p>
                  <p className="mt-1 text-xs text-[var(--hexa-muted)]">
                    Redirecting to your order summary...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ number, title, children }) {
  return (
    <section className="hexa-card p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white shadow">
          {number}
        </span>
        <h2 className="text-lg font-semibold text-[var(--hexa-text)]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="hexa-label mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}

function Summary({ label, value, positive = false }) {
  return (
    <div className="flex justify-between gap-3 text-[var(--hexa-muted)]">
      <span>{label}</span>
      <span className={positive ? 'font-semibold text-emerald-400' : 'text-[var(--hexa-text)]'}>
        {value}
      </span>
    </div>
  )
}
