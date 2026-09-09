import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaCoins,
  FaCheck,
  FaCopy,
  FaQrcode,
  FaInfoCircle,
  FaLock,
  FaHistory,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaArrowRight,
  FaShieldAlt,
} from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useToast } from '../../contexts/ToastContext'
import { apiErrorMessage } from '../../api/client'
import { getPaymentMethods } from '../../api/catalog.api'
import {
  getWallet,
  getWalletCreditPackages,
  createWalletCreditPurchase,
  getMyWalletCreditPurchases,
} from '../../api/features.api'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import AdminCursorPagination from '../../components/AdminCursorPagination'

export default function WalletCreditsPage() {
  const { user } = useAuth()
  const { format } = useCurrency()
  const { notify } = useToast()

  // State
  const [wallet, setWallet] = useState(null)
  const [packages, setPackages] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [purchases, setPurchases] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(15)
  const [cursor, setCursor] = useState(null)
  const [direction, setDirection] = useState('next')

  const [selectedPackage, setSelectedPackage] = useState(null)
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [form, setForm] = useState({
    senderNumber: '',
    transactionId: '',
    customerNote: '',
  })

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [detailModal, setDetailModal] = useState(null)

  // Load Initial Data
  const loadBaseData = async () => {
    try {
      setLoading(true)
      const [walletData, pkgData, methodsData] = await Promise.all([
        getWallet().catch(() => null),
        getWalletCreditPackages().catch(() => []),
        getPaymentMethods().catch(() => []),
      ])

      setWallet(walletData)
      setPackages(pkgData || [])

      // Only show active non-wallet payment methods
      const availableMethods = (methodsData || []).filter(
        (m) => m.active && m.gatewayType !== 'wallet'
      )
      setPaymentMethods(availableMethods)

      if (pkgData?.length > 0 && !selectedPackage) {
        // Default select second or first package
        setSelectedPackage(pkgData[1] || pkgData[0])
      }
      if (availableMethods?.length > 0 && !selectedMethod) {
        setSelectedMethod(availableMethods[0])
      }
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to load wallet data'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load Purchases History
  const loadPurchases = async (cur = null, dir = 'next', lim = limit) => {
    try {
      const res = await getMyWalletCreditPurchases({
        cursor: cur,
        direction: dir,
        limit: lim,
      })
      setPurchases(res?.data || [])
      setMeta(res?.meta || null)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadBaseData()
    loadPurchases()
  }, [])

  const handleNext = (nextCursor) => {
    const cur = nextCursor || meta?.nextCursor
    if (cur) {
      setCursor(cur)
      setDirection('next')
      loadPurchases(cur, 'next', limit)
    }
  }

  const handlePrev = (prevCursor) => {
    const cur = prevCursor || meta?.prevCursor
    if (cur) {
      setCursor(cur)
      setDirection('prev')
      loadPurchases(cur, 'prev', limit)
    }
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    setCursor(null)
    setDirection('next')
    loadPurchases(null, 'next', newLimit)
  }

  const copyAccountNumber = () => {
    if (!selectedMethod?.accountNumber) return
    navigator.clipboard?.writeText(selectedMethod.accountNumber)
    setCopied(true)
    notify('Account number copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  // Submit Purchase Request
  const handleSubmitPurchase = async (e) => {
    e.preventDefault()

    if (!selectedPackage) {
      notify('Please select a credit package.', 'error')
      return
    }
    if (!selectedMethod) {
      notify('Please select a payment method.', 'error')
      return
    }

    if (selectedMethod.gatewayType === 'manual' && !form.senderNumber && !form.transactionId) {
      notify('Please enter your Sender Number and Transaction ID.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const created = await createWalletCreditPurchase({
        packageId: selectedPackage._id,
        paymentMethodId: selectedMethod._id,
        senderNumber: form.senderNumber,
        transactionId: form.transactionId,
        customerNote: form.customerNote,
      })

      notify('Credit purchase request submitted! Awaiting payment verification.')
      setForm({ senderNumber: '', transactionId: '', customerNote: '' })
      loadPurchases()
      setDetailModal(created)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to submit credit purchase request'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="hexa-section-kicker">Store Credit & Balance</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[var(--hexa-text)]">
            Wallet & Credit Packages
          </h1>
          <p className="mt-1 text-sm text-[var(--hexa-muted)]">
            Purchase wallet credits using your preferred mobile banking or bank payment methods.
          </p>
        </div>
        <Link
          to="/account/rewards"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-4 py-2.5 text-xs font-semibold text-[var(--hexa-text)] hover:border-purple-500/40 transition"
        >
          <FaCoins className="text-purple-400" /> Affiliate & Loyalty →
        </Link>
      </div>

      {/* Balance Summary Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="hexa-card relative overflow-hidden p-5 border-purple-500/20 bg-gradient-to-br from-purple-500/[0.07] to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-purple-400">
              Available Balance
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
              <FaCoins size={14} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black tracking-tight text-[var(--hexa-text)]">
            {format(wallet?.walletBalance || 0)}
          </p>
          <p className="mt-1 text-xs text-[var(--hexa-muted)]">Usable instantly across all store checkouts</p>
        </div>

        <div className="hexa-card p-5">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--hexa-muted)]">
            Loyalty Points
          </span>
          <p className="mt-3 text-3xl font-black text-[var(--hexa-text)]">
            {wallet?.loyaltyPoints || 0}{' '}
            <span className="text-sm font-semibold text-purple-400">pts</span>
          </p>
          <p className="mt-1 text-xs text-[var(--hexa-muted)]">Earned from delivered orders</p>
        </div>

        <div className="hexa-card p-5">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--hexa-muted)]">
            Affiliate Referral Code
          </span>
          <p className="mt-3 font-mono text-xl font-extrabold text-purple-400">
            {wallet?.referralCode || '—'}
          </p>
          <p className="mt-1 text-xs text-[var(--hexa-muted)]">Share to earn commission rewards</p>
        </div>
      </div>

      {/* Buy Credits Form Card */}
      <div className="mt-8 hexa-card p-6 sm:p-8">
        <div className="flex items-center gap-3 border-b border-[var(--hexa-border)] pb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white font-bold">
            1
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--hexa-text)]">Select a Credit Package</h2>
            <p className="text-xs text-[var(--hexa-muted)]">
              Choose how many credits you want to add to your wallet.
            </p>
          </div>
        </div>

        {/* Dynamic Packages Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => {
            const isSelected = selectedPackage?._id === pkg._id
            return (
              <button
                type="button"
                key={pkg._id}
                onClick={() => setSelectedPackage(pkg)}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 text-left transition ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/[0.08] shadow-md ring-2 ring-purple-500/40'
                    : 'border-[var(--hexa-border)] bg-[var(--hexa-surface)] hover:border-purple-500/40'
                }`}
              >
                {pkg.badge && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                    {pkg.badge}
                  </span>
                )}

                <div>
                  <p className="font-bold text-sm text-[var(--hexa-text)]">{pkg.name}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-purple-400">
                      {pkg.totalCredits.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-[var(--hexa-muted)]">Credits</span>
                  </div>

                  {pkg.bonusCredits > 0 && (
                    <p className="mt-1 text-xs font-semibold text-emerald-400">
                      +{pkg.bonusCredits} Free Bonus Credits
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--hexa-border)]/60 flex items-center justify-between">
                  <span className="text-xs text-[var(--hexa-muted)]">Pay Amount:</span>
                  <span className="font-extrabold text-base text-[var(--hexa-text)]">
                    ৳{pkg.payAmount.toLocaleString()}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Step 2: Payment Method */}
        <div className="mt-8 pt-8 border-t border-[var(--hexa-border)]">
          <div className="flex items-center gap-3 pb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white font-bold">
              2
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--hexa-text)]">Choose Payment Method</h2>
              <p className="text-xs text-[var(--hexa-muted)]">
                Send ৳{selectedPackage ? selectedPackage.payAmount.toLocaleString() : '0'} to our official payment number.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {paymentMethods.map((method) => {
              const isSelected = selectedMethod?._id === method._id
              return (
                <button
                  type="button"
                  key={method._id}
                  onClick={() => setSelectedMethod(method)}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/[0.08] ring-1 ring-purple-500'
                      : 'border-[var(--hexa-border)] bg-[var(--hexa-surface)] hover:border-purple-500/30'
                  }`}
                >
                  {method.logo?.url ? (
                    <img
                      src={method.logo.url}
                      alt={method.name}
                      className="h-9 w-9 rounded-lg object-contain bg-white p-1"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 font-bold">
                      💳
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--hexa-text)] truncate">
                      {method.name}
                    </p>
                    <p className="text-[11px] text-[var(--hexa-muted)] uppercase truncate">
                      {method.accountType || 'Payment'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Payment Account Details Display */}
          {selectedMethod && (
            <div className="mt-5 rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-semibold tracking-wider text-purple-400">
                      Send Money / Transfer To
                    </span>
                    {selectedMethod.accountType && (
                      <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-[11px] font-semibold text-purple-300">
                        {selectedMethod.accountType}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="font-mono text-2xl sm:text-3xl font-black tracking-wide text-[var(--hexa-text)]">
                      {selectedMethod.accountNumber || '—'}
                    </span>
                    {selectedMethod.accountNumber && (
                      <button
                        type="button"
                        onClick={copyAccountNumber}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          copied
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs'
                        }`}
                      >
                        {copied ? <><FaCheck /> Copied</> : <><FaCopy /> Copy Number</>}
                      </button>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                {selectedMethod.qrCode?.url && (
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] p-2 hover:border-purple-500 transition"
                  >
                    <img
                      src={selectedMethod.qrCode.url}
                      alt="Scan QR"
                      className="h-12 w-12 rounded-lg object-contain bg-white"
                    />
                    <span className="text-xs font-semibold text-purple-300 flex items-center gap-1">
                      <FaQrcode /> Scan QR
                    </span>
                  </button>
                )}
              </div>

              {/* Exact Amount Banner */}
              <div className="flex items-center justify-between rounded-xl bg-purple-500/10 border border-purple-500/20 p-3.5">
                <span className="text-xs font-semibold text-[var(--hexa-muted)]">
                  Exact Amount to Send:
                </span>
                <span className="text-xl font-black text-purple-300">
                  ৳{selectedPackage ? selectedPackage.payAmount.toLocaleString() : '0'}
                </span>
              </div>

              {/* Instructions */}
              {selectedMethod.instructions && (
                <div className="rounded-xl bg-[var(--hexa-surface)] p-4 text-xs text-[var(--hexa-muted)] leading-relaxed whitespace-pre-line border border-[var(--hexa-border)]">
                  <p className="font-bold text-[var(--hexa-text)] mb-1 flex items-center gap-1.5">
                    <FaInfoCircle className="text-purple-400" /> Instructions:
                  </p>
                  {selectedMethod.instructions}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Transaction Info & Submit */}
        <form onSubmit={handleSubmitPurchase} className="mt-8 pt-8 border-t border-[var(--hexa-border)] space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white font-bold">
              3
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--hexa-text)]">Payment Verification Details</h2>
              <p className="text-xs text-[var(--hexa-muted)]">
                Provide your transaction reference after sending the money.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1.5">
                Sender Number / Paying Account <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 017XXXXXXXX"
                value={form.senderNumber}
                onChange={(e) => setForm({ ...form, senderNumber: e.target.value })}
                className="hexa-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1.5">
                Transaction ID / Reference <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TRX99887766"
                value={form.transactionId}
                onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
                className="hexa-input text-sm font-mono uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1.5">
                Optional Customer Note
              </label>
              <input
                type="text"
                placeholder="Any special remarks regarding your transaction"
                value={form.customerNote}
                onChange={(e) => setForm({ ...form, customerNote: e.target.value })}
                className="hexa-input text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
            <p className="text-xs text-[var(--hexa-muted)] flex items-center gap-1.5">
              <FaShieldAlt className="text-emerald-400" />
              Payment will be verified by admin within 5-15 minutes and credited immediately.
            </p>
            <button
              type="submit"
              disabled={submitting || !selectedPackage || !selectedMethod}
              className="hexa-btn !py-3.5 px-8 font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {submitting ? 'Submitting Request...' : 'Submit Credit Request →'}
            </button>
          </div>
        </form>
      </div>

      {/* Purchase History Section */}
      <div className="mt-10 hexa-card p-6 sm:p-8">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--hexa-border)]">
          <FaHistory className="text-purple-400" size={18} />
          <h2 className="text-lg font-bold text-[var(--hexa-text)]">Credit Purchase History</h2>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--hexa-border)] text-[var(--hexa-muted)] uppercase tracking-wider">
                <th className="py-3 px-3">Request No.</th>
                <th className="py-3 px-3">Package</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-right">Credits</th>
                <th className="py-3 px-3">Method & Trx</th>
                <th className="py-3 px-3">Submitted</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {purchases.length > 0 ? (
                purchases.map((item) => (
                  <tr key={item._id} className="hover:bg-[var(--hexa-surface)] transition">
                    <td className="py-3.5 px-3 font-mono font-bold text-[var(--hexa-text)]">
                      {item.purchaseNumber}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-[var(--hexa-text)]">
                      {item.packageName || 'Credit Pack'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-[var(--hexa-text)]">
                      ৳{item.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-extrabold text-purple-400">
                      +{item.totalCredits.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-[var(--hexa-muted)]">
                      <span className="font-semibold text-[var(--hexa-text)]">{item.paymentMethod}</span>
                      {item.transactionId && (
                        <span className="block font-mono text-[11px] text-purple-300">
                          {item.transactionId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-[var(--hexa-muted)] whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}{' '}
                      <span className="text-[10px] opacity-70">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <StatusBadge value={item.status} />
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailModal(item)}
                        className="rounded-lg bg-purple-500/10 px-2.5 py-1 font-semibold text-purple-400 hover:bg-purple-500/20 transition"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-[var(--hexa-muted)]">
                    No credit purchase requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminCursorPagination
          meta={meta}
          onNext={handleNext}
          onPrev={handlePrev}
          limit={limit}
          onLimitChange={handleLimitChange}
          pageSizeOptions={[10, 15, 30, 50]}
        />
      </div>

      {/* QR Code Zoom Modal */}
      <Modal open={qrModalOpen} onClose={() => setQrModalOpen(false)} title="Scan Payment QR" maxWidth="max-w-sm">
        {selectedMethod?.qrCode?.url && (
          <div className="text-center p-4">
            <img
              src={selectedMethod.qrCode.url}
              alt="QR Code"
              className="mx-auto h-64 w-64 rounded-2xl border border-[var(--hexa-border)] bg-white p-3 object-contain"
            />
            <p className="mt-4 font-mono font-bold text-lg text-[var(--hexa-text)]">
              {selectedMethod.accountNumber}
            </p>
            <p className="text-xs text-[var(--hexa-muted)] mt-1">{selectedMethod.name}</p>
          </div>
        )}
      </Modal>

      {/* Purchase Details Modal */}
      <Modal
        open={Boolean(detailModal)}
        onClose={() => setDetailModal(null)}
        title={`Purchase Details: ${detailModal?.purchaseNumber || ''}`}
        maxWidth="max-w-md"
      >
        {detailModal && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--hexa-border)]">
              <span className="text-[var(--hexa-muted)]">Status:</span>
              <StatusBadge value={detailModal.status} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--hexa-muted)]">Package:</span>
                <span className="font-semibold text-[var(--hexa-text)]">{detailModal.packageName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--hexa-muted)]">Amount Paid:</span>
                <span className="font-bold text-[var(--hexa-text)]">৳{detailModal.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--hexa-muted)]">Base Credits:</span>
                <span className="font-semibold text-[var(--hexa-text)]">{detailModal.credits}</span>
              </div>
              {detailModal.bonusCredits > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Bonus Credits:</span>
                  <span>+{detailModal.bonusCredits}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--hexa-border)] pt-2 font-bold text-sm">
                <span className="text-purple-400">Total Credits:</span>
                <span className="text-purple-400">+{detailModal.totalCredits.toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-xl bg-[var(--hexa-surface)] p-3 border border-[var(--hexa-border)] space-y-1.5">
              <p className="font-semibold text-[var(--hexa-text)]">Payment Details</p>
              <p className="text-[var(--hexa-muted)]">Method: {detailModal.paymentMethod}</p>
              {detailModal.senderNumber && <p className="text-[var(--hexa-muted)]">Sender Number: {detailModal.senderNumber}</p>}
              {detailModal.transactionId && <p className="font-mono text-purple-300">Trx ID: {detailModal.transactionId}</p>}
              {detailModal.customerNote && <p className="text-[var(--hexa-muted)] italic">Note: {detailModal.customerNote}</p>}
            </div>

            {detailModal.status === 'rejected' && detailModal.rejectionReason && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-rose-300">
                <p className="font-bold mb-0.5">Rejection Reason:</p>
                <p>{detailModal.rejectionReason}</p>
              </div>
            )}

            {detailModal.status === 'approved' && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-300">
                <p className="font-bold flex items-center gap-1.5">
                  <FaCheckCircle /> Approved & Credited
                </p>
                <p className="mt-1 text-[11px] opacity-80">
                  Approved on {new Date(detailModal.approvedAt || detailModal.updatedAt).toLocaleString()}
                </p>
              </div>
            )}

            <div className="text-[11px] text-[var(--hexa-muted)] pt-2">
              Submitted on {new Date(detailModal.createdAt).toLocaleString()}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
