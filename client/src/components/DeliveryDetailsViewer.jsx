import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  CheckmarkCircle01Icon,
  Clock01Icon,
  Copy01Icon,
  Key01Icon,
  Link01Icon,
  LockPasswordIcon,
  Shield01Icon,
  UserCircleIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons'

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(String(text))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
        copied
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-[var(--hexa-card)] text-[var(--hexa-text)] hover:bg-purple-500/15 hover:text-purple-400 border border-[var(--hexa-border)]'
      }`}
      title="Copy to clipboard"
    >
      {copied ? <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} /> : <HugeiconsIcon icon={Copy01Icon} size={12} />}
      <span>{copied ? 'Copied!' : label}</span>
    </button>
  )
}

function CredentialField({ label, value, icon: Icon, isSecret = false }) {
  const [show, setShow] = useState(false)

  if (!value && value !== 0) return null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/80 p-3.5 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--hexa-muted)]">
          {Icon && <HugeiconsIcon icon={Icon} size={14} className="text-purple-400 shrink-0" />}
          <span>{label}</span>
        </div>
        <p className="mt-1 font-mono text-sm font-bold text-[var(--hexa-text)] break-all select-all">
          {isSecret && !show ? '••••••••••••••••' : String(value)}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-2.5 py-1 text-xs font-semibold text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] transition"
          >
            {show ? <HugeiconsIcon icon={ViewOffSlashIcon} size={13} /> : <HugeiconsIcon icon={ViewIcon} size={13} />}
            <span>{show ? 'Hide' : 'Show'}</span>
          </button>
        )}
        <CopyButton text={value} />
      </div>
    </div>
  )
}

function SingleCredentialsCard({ data }) {
  if (!data) return null

  if (typeof data === 'string') {
    return (
      <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4">
        <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--hexa-text)] select-all font-sans">
          {data}
        </p>
        <div className="mt-3 flex justify-end">
          <CopyButton text={data} label="Copy info" />
        </div>
      </div>
    )
  }

  if (data.deliveryType === 'topup' || data.topUpStatus === 'completed') {
    const gameAccount = data.gameAccount || {}
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} className="rounded-full bg-emerald-500/20 p-0.5 text-emerald-400" />
          <span>Direct In-Game Top-Up Completed</span>
        </div>
        <p className="mt-1.5 text-xs text-[var(--hexa-muted)]">
          The requested diamonds / UC have been directly credited to your player account.
        </p>

        {Object.keys(gameAccount).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(gameAccount).filter(([, v]) => v).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                <span className="capitalize text-[var(--hexa-muted)] text-[11px]">{k.replace(/([A-Z])/g, ' $1')}:</span>
                <span className="font-mono">{String(v)}</span>
              </span>
            ))}
          </div>
        )}

        {data.note && (
          <div className="mt-3 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-3 text-xs">
            <span className="font-semibold text-purple-400">Top-Up Reference / Note: </span>
            <span className="text-[var(--hexa-text)]">{data.note}</span>
          </div>
        )}
      </div>
    )
  }

  // Common field mappings
  const email = data.email || data.username || data.user || data.login || data.account
  const password = data.password || data.pass || data.secret
  const key = data.licenseKey || data.key || data.license || data.serial
  const activationCode = data.activationCode || (data.code && data.code !== key ? data.code : '')
  const profileName = data.profileName || data.profileSlot || (data.profile && typeof data.profile === 'string' && isNaN(data.profile) ? data.profile : '')
  const pin = data.pin || data.profilePin || data.screen || (data.profile && !isNaN(data.profile) ? data.profile : '')
  const expiryDate = data.expiryDate || data.expiresAt || data.validUntil || data.expiration
  const referenceId = data.referenceId || data.transactionId || data.trxId || data.orderRef
  const url = data.url || data.link || data.loginUrl || data.downloadUrl
  const notes = data.instructions || data.notes || data.note || data.guide

  // Extra generic keys that are not standard
  const standardKeys = new Set([
    'email', 'username', 'user', 'login', 'account',
    'password', 'pass', 'secret',
    'key', 'licenseKey', 'license', 'serial',
    'activationCode', 'code',
    'profileName', 'profileSlot',
    'pin', 'profilePin', 'profile', 'screen',
    'expiryDate', 'expiresAt', 'validUntil', 'expiration',
    'referenceId', 'transactionId', 'trxId', 'orderRef',
    'url', 'link', 'loginUrl', 'downloadUrl',
    'instructions', 'notes', 'note', 'guide',
    'productName', 'variantName', 'productId', 'variantId',
    'deliveryType', 'topUpStatus', 'gameAccount',
  ])

  const extraEntries = Object.entries(data).filter(([k]) => !standardKeys.has(k))

  return (
    <div className="space-y-2.5">
      {email && <CredentialField label="Email / Username" value={email} icon={UserCircleIcon} />}
      {password && <CredentialField label="Password" value={password} icon={LockPasswordIcon} isSecret />}
      {profileName && <CredentialField label="Profile Name / Slot" value={profileName} icon={UserCircleIcon} />}
      {pin && <CredentialField label="Profile PIN / Screen" value={pin} icon={Shield01Icon} />}
      {key && <CredentialField label="License / Product Key" value={key} icon={Key01Icon} />}
      {activationCode && <CredentialField label="Activation Code" value={activationCode} icon={Key01Icon} />}
      {expiryDate && <CredentialField label="Expiry Date / Duration" value={typeof expiryDate === 'string' && expiryDate.includes('T') ? new Date(expiryDate).toLocaleDateString() : String(expiryDate)} icon={Clock01Icon} />}
      {referenceId && <CredentialField label="Transaction / Reference ID" value={referenceId} icon={Key01Icon} />}
      {url && <CredentialField label="Login / Download Link" value={url} icon={Link01Icon} />}

      {extraEntries.map(([k, v]) => (
        <CredentialField
          key={k}
          label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
          value={typeof v === 'object' ? JSON.stringify(v) : String(v)}
          icon={Key01Icon}
        />
      ))}

      {notes && (
        <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-3.5 text-xs text-[var(--hexa-muted)]">
          <p className="font-bold text-purple-400 mb-1">Instructions / Note:</p>
          <p className="whitespace-pre-line leading-relaxed text-[var(--hexa-text)] font-sans">
            {notes}
          </p>
        </div>
      )}
    </div>
  )
}

export default function DeliveryDetailsViewer({ details }) {
  if (!details) {
    return (
      <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4 text-center text-sm text-[var(--hexa-muted)]">
        Delivery credentials will appear here once fulfilled.
      </div>
    )
  }

  // Handle bundle multi-units delivery: details.units = [...]
  if (details.units && Array.isArray(details.units)) {
    return (
      <div className="space-y-4">
        {details.units.map((unit, index) => (
          <div
            key={index}
            className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] p-4"
          >
            <div className="flex items-center gap-2 mb-3 border-b border-[var(--hexa-border)]/50 pb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold">
                {index + 1}
              </span>
              <h4 className="font-bold text-sm text-[var(--hexa-text)]">
                {unit.productName || `Package Item #${index + 1}`}
              </h4>
            </div>
            <SingleCredentialsCard data={unit.details || unit} />
          </div>
        ))}
      </div>
    )
  }

  return <SingleCredentialsCard data={details} />
}
