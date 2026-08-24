import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  Edit02Icon,
  GameController01Icon,
  GlobalIcon,
  Key01Icon,
  MagicWand01Icon,
  PlusSignIcon,
  Tick02Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons'
import Modal from './Modal'

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', desc: 'Single line text (e.g. User ID, Player Tag)' },
  { value: 'number', label: 'Number', desc: 'Numeric values (e.g. Zone ID, Quantity)' },
  { value: 'email', label: 'Email Address', desc: 'Validated email (e.g. Account Email)' },
  { value: 'phone', label: 'Phone Number', desc: 'Phone number input' },
  { value: 'textarea', label: 'Multi-line Text', desc: 'Long notes or special instructions' },
  { value: 'select', label: 'Dropdown / Select', desc: 'Customer chooses 1 option from a list' },
  { value: 'radio', label: 'Radio Buttons', desc: 'Single choice from visible pill buttons' },
  { value: 'checkbox', label: 'Checkbox', desc: 'Boolean toggle or multi-select' },
  { value: 'toggle', label: 'Toggle Switch', desc: 'Yes / No switch' },
  { value: 'date', label: 'Date', desc: 'Date picker' },
]

const TEMPLATE_PRESETS = [
  {
    name: 'Mobile Legends (User ID + Zone ID)',
    icon: GameController01Icon,
    fields: [
      { name: 'userId', label: 'User ID', type: 'text', placeholder: 'e.g. 12345678', helpText: 'Found on MLBB profile avatar', required: true, validation: { minLength: 5, maxLength: 15 } },
      { name: 'zoneId', label: 'Zone ID', type: 'number', placeholder: 'e.g. 2045', helpText: '4-5 digit number in brackets next to User ID', required: true, validation: { min: 100, max: 99999 } },
    ],
  },
  {
    name: 'Player ID / UID (Free Fire, PUBG, CODM)',
    icon: GameController01Icon,
    fields: [
      { name: 'playerId', label: 'Player ID / Character UID', type: 'text', placeholder: 'e.g. 5123456789', helpText: 'Numeric player ID from in-game profile', required: true, validation: { minLength: 5, maxLength: 20 } },
    ],
  },
  {
    name: 'Riot Games (Riot ID + Tagline + Server)',
    icon: GameController01Icon,
    fields: [
      { name: 'riotId', label: 'Riot ID', type: 'text', placeholder: 'e.g. Shadow', helpText: 'Your Riot username', required: true, validation: { minLength: 3, maxLength: 30 } },
      { name: 'tagline', label: 'Tagline (#)', type: 'text', placeholder: 'e.g. NA1 or 1234', helpText: 'Characters following the # symbol', required: true, validation: { minLength: 2, maxLength: 8 } },
      { name: 'region', label: 'Server Region', type: 'select', options: ['Asia / Pacific', 'North America', 'Europe', 'Latin America'], required: true },
    ],
  },
  {
    name: 'Account Email / Login (Netflix, Spotify, Subscriptions)',
    icon: UserCircleIcon,
    fields: [
      { name: 'email', label: 'Account Email', type: 'email', placeholder: 'e.g. user@example.com', helpText: 'Your existing account email to activate', required: true },
      { name: 'existingPassword', label: 'Account Password (Optional)', type: 'text', placeholder: 'Enter password if direct recharge is required', helpText: 'Leave blank if not needed', required: false },
    ],
  },
  {
    name: 'Region / Country Selector',
    icon: GlobalIcon,
    fields: [
      { name: 'region', label: 'Target Region / Country', type: 'select', options: ['Global', 'Bangladesh', 'United States', 'Turkey', 'Argentina', 'India'], required: true },
    ],
  },
  {
    name: 'License / Activation Details',
    icon: Key01Icon,
    fields: [
      { name: 'systemType', label: 'Architecture / System', type: 'select', options: ['Windows 64-bit', 'Windows 32-bit', 'Mac OS', 'Linux'], required: false },
      { name: 'notes', label: 'Custom Notes', type: 'text', placeholder: 'Optional notes for activation', required: false },
    ],
  },
]

const blankField = () => ({
  name: '',
  label: '',
  type: 'text',
  placeholder: '',
  helpText: '',
  required: true,
  defaultValue: '',
  options: [],
  validation: {
    minLength: undefined,
    maxLength: undefined,
    min: undefined,
    max: undefined,
    regex: '',
    customErrorMessage: '',
  },
})

export default function DynamicFieldBuilder({ fields = [], onChange }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [fieldForm, setFieldForm] = useState(blankField)
  const [rawOption, setRawOption] = useState('')

  const openAdd = () => {
    setEditingIndex(null)
    setFieldForm(blankField())
    setRawOption('')
    setModalOpen(true)
  }

  const openEdit = (index) => {
    setEditingIndex(index)
    const current = fields[index]
    setFieldForm({
      ...blankField(),
      ...current,
      validation: { ...blankField().validation, ...(current.validation || {}) },
      options: current.options || [],
    })
    setRawOption('')
    setModalOpen(true)
  }

  const saveField = (e) => {
    e.preventDefault()
    const nameKey = fieldForm.name.trim() || fieldForm.label.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
    if (!nameKey || !fieldForm.label.trim()) return

    const updatedField = {
      ...fieldForm,
      name: nameKey,
      label: fieldForm.label.trim(),
      placeholder: fieldForm.placeholder.trim(),
      helpText: fieldForm.helpText.trim(),
      options: fieldForm.options || [],
      validation: {
        ...(fieldForm.validation.minLength ? { minLength: Number(fieldForm.validation.minLength) } : {}),
        ...(fieldForm.validation.maxLength ? { maxLength: Number(fieldForm.validation.maxLength) } : {}),
        ...(fieldForm.validation.min !== undefined && fieldForm.validation.min !== '' ? { min: Number(fieldForm.validation.min) } : {}),
        ...(fieldForm.validation.max !== undefined && fieldForm.validation.max !== '' ? { max: Number(fieldForm.validation.max) } : {}),
        ...(fieldForm.validation.regex?.trim() ? { regex: fieldForm.validation.regex.trim() } : {}),
        ...(fieldForm.validation.customErrorMessage?.trim() ? { customErrorMessage: fieldForm.validation.customErrorMessage.trim() } : {}),
      },
    }

    if (editingIndex !== null) {
      const copy = [...fields]
      copy[editingIndex] = updatedField
      onChange(copy)
    } else {
      onChange([...fields, updatedField])
    }
    setModalOpen(false)
  }

  const removeField = (index) => {
    onChange(fields.filter((_, i) => i !== index))
  }

  const moveField = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= fields.length) return
    const copy = [...fields]
    const temp = copy[index]
    copy[index] = copy[target]
    copy[target] = temp
    onChange(copy)
  }

  const applyTemplate = (template) => {
    const newFields = template.fields.map((f) => ({
      ...blankField(),
      ...f,
      options: f.options || [],
      validation: f.validation || {},
    }))
    onChange(newFields)
  }

  const addOption = () => {
    const trimmed = rawOption.trim()
    if (!trimmed) return
    if (!fieldForm.options.includes(trimmed)) {
      setFieldForm({
        ...fieldForm,
        options: [...(fieldForm.options || []), trimmed],
      })
    }
    setRawOption('')
  }

  const removeOption = (idx) => {
    setFieldForm({
      ...fieldForm,
      options: fieldForm.options.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="space-y-4">
      {/* Header with Quick Presets */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-bold text-[var(--hexa-text)] flex items-center gap-2">
            <span>Dynamic Customer Information Fields</span>
            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400 font-semibold">
              {fields.length} {fields.length === 1 ? 'field' : 'fields'}
            </span>
          </h3>
          <p className="mt-1 text-xs text-[var(--hexa-muted)]">
            Define what player/account details customers must submit at checkout for this specific product.
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="hexa-btn !px-3.5 !py-2 text-xs self-start sm:self-auto"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={14} /> Add Custom Field
        </button>
      </div>

      {/* Quick Presets Bar */}
      <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/60 p-3">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[var(--hexa-muted)]">
          <HugeiconsIcon icon={MagicWand01Icon} size={14} className="text-purple-400" />
          <span>Quick Template Presets (1-Click Load & Customize):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_PRESETS.map((preset, pIdx) => {
            const Icon = preset.icon
            return (
              <button
                key={pIdx}
                type="button"
                onClick={() => applyTemplate(preset)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/[0.06] px-2.5 py-1 text-xs font-medium text-purple-300 hover:bg-purple-500/15 hover:border-purple-500/40 transition"
              >
                <HugeiconsIcon icon={Icon} size={12} />
                <span>{preset.name}</span>
              </button>
            )
          })}
          {fields.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-2.5 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/15 transition ml-auto"
            >
              <HugeiconsIcon icon={Delete02Icon} size={12} /> Clear Fields
            </button>
          )}
        </div>
      </div>

      {/* Fields List */}
      {fields.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--hexa-border)] p-8 text-center">
          <p className="text-sm font-medium text-[var(--hexa-muted)]">
            No customer input fields configured.
          </p>
          <p className="mt-1 text-xs text-[var(--hexa-muted)]">
            For products without customer inputs (e.g. direct license keys delivered automatically), no fields are needed. Or click &ldquo;Add Custom Field&rdquo; or a preset above.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {fields.map((field, idx) => (
            <div
              key={field.name || idx}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-3.5 transition hover:border-purple-500/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-xs font-bold text-purple-400">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-[var(--hexa-text)]">{field.label}</p>
                    <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[11px] text-purple-300">
                      key: {field.name}
                    </span>
                    <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400 uppercase">
                      {field.type}
                    </span>
                    {field.required ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        Required
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--hexa-muted)]">
                        Optional
                      </span>
                    )}
                  </div>
                  {(field.placeholder || field.helpText || field.options?.length > 0) && (
                    <p className="mt-1 text-xs text-[var(--hexa-muted)] truncate">
                      {field.placeholder && <span>Placeholder: &ldquo;{field.placeholder}&rdquo; · </span>}
                      {field.helpText && <span>Help: {field.helpText} · </span>}
                      {field.options?.length > 0 && <span>Options: [{field.options.join(', ')}]</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveField(idx, -1)}
                  className="rounded-lg p-1.5 text-[var(--hexa-muted)] hover:bg-white/5 disabled:opacity-30"
                  title="Move Up"
                >
                  <HugeiconsIcon icon={ArrowUp01Icon} size={14} />
                </button>
                <button
                  type="button"
                  disabled={idx === fields.length - 1}
                  onClick={() => moveField(idx, 1)}
                  className="rounded-lg p-1.5 text-[var(--hexa-muted)] hover:bg-white/5 disabled:opacity-30"
                  title="Move Down"
                >
                  <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(idx)}
                  className="rounded-lg p-1.5 text-purple-400 hover:bg-purple-500/10"
                  title="Edit Field"
                >
                  <HugeiconsIcon icon={Edit02Icon} size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeField(idx)}
                  className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10"
                  title="Delete Field"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Field Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingIndex !== null ? 'Edit Customer Input Field' : 'Add Dynamic Customer Input Field'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={saveField} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="hexa-label">Field Label *</span>
              <input
                required
                className="hexa-input"
                value={fieldForm.label}
                onChange={(e) => {
                  const label = e.target.value
                  const autoKey = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 40)
                  setFieldForm((cur) => ({
                    ...cur,
                    label,
                    name: cur.name && cur.name !== cur.label.toLowerCase().replace(/[^a-z0-9]/g, '_') ? cur.name : autoKey,
                  }))
                }}
                placeholder="e.g. User ID or Player ID"
              />
            </label>

            <label className="block">
              <span className="hexa-label">Field Key / API Name *</span>
              <input
                required
                className="hexa-input font-mono text-xs"
                value={fieldForm.name}
                onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder="e.g. userId"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="hexa-label">Field Type</span>
              <select
                className="hexa-input"
                value={fieldForm.type}
                onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value })}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="hexa-label">Placeholder Text</span>
              <input
                className="hexa-input"
                value={fieldForm.placeholder}
                onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                placeholder="e.g. Enter your 8-digit User ID"
              />
            </label>
          </div>

          <label className="block">
            <span className="hexa-label">Help Text / Instruction for Customer</span>
            <input
              className="hexa-input"
              value={fieldForm.helpText}
              onChange={(e) => setFieldForm({ ...fieldForm, helpText: e.target.value })}
              placeholder="e.g. Found on your in-game profile avatar screen"
            />
          </label>

          {/* Options for Select, Radio, Checkbox */}
          {['select', 'radio', 'checkbox'].includes(fieldForm.type) && (
            <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-3.5 space-y-3">
              <span className="hexa-label block">Available Options ({fieldForm.options?.length || 0})</span>
              <div className="flex gap-2">
                <input
                  className="hexa-input flex-1 text-xs"
                  value={rawOption}
                  onChange={(e) => setRawOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addOption()
                    }
                  }}
                  placeholder="Type an option name (e.g. Asia Server) and press Add"
                />
                <button type="button" onClick={addOption} className="hexa-btn-secondary !px-3 !py-1 text-xs">
                  <HugeiconsIcon icon={PlusSignIcon} size={14} /> Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {(fieldForm.options || []).map((opt, oIdx) => (
                  <span
                    key={oIdx}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300"
                  >
                    <span>{opt}</span>
                    <button
                      type="button"
                      onClick={() => removeOption(oIdx)}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Validation Rules Section */}
          <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-3.5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-muted)]">
              Validation Rules & Constraints
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              {fieldForm.type === 'number' ? (
                <>
                  <label className="block">
                    <span className="text-[11px] text-[var(--hexa-muted)] font-medium">Min Numeric Value</span>
                    <input
                      type="number"
                      className="hexa-input text-xs"
                      value={fieldForm.validation.min ?? ''}
                      onChange={(e) =>
                        setFieldForm({
                          ...fieldForm,
                          validation: { ...fieldForm.validation, min: e.target.value ? Number(e.target.value) : undefined },
                        })
                      }
                      placeholder="e.g. 1"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-[var(--hexa-muted)] font-medium">Max Numeric Value</span>
                    <input
                      type="number"
                      className="hexa-input text-xs"
                      value={fieldForm.validation.max ?? ''}
                      onChange={(e) =>
                        setFieldForm({
                          ...fieldForm,
                          validation: { ...fieldForm.validation, max: e.target.value ? Number(e.target.value) : undefined },
                        })
                      }
                      placeholder="e.g. 99999"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="text-[11px] text-[var(--hexa-muted)] font-medium">Min Character Length</span>
                    <input
                      type="number"
                      min="0"
                      className="hexa-input text-xs"
                      value={fieldForm.validation.minLength ?? ''}
                      onChange={(e) =>
                        setFieldForm({
                          ...fieldForm,
                          validation: { ...fieldForm.validation, minLength: e.target.value ? Number(e.target.value) : undefined },
                        })
                      }
                      placeholder="e.g. 4"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-[var(--hexa-muted)] font-medium">Max Character Length</span>
                    <input
                      type="number"
                      min="0"
                      className="hexa-input text-xs"
                      value={fieldForm.validation.maxLength ?? ''}
                      onChange={(e) =>
                        setFieldForm({
                          ...fieldForm,
                          validation: { ...fieldForm.validation, maxLength: e.target.value ? Number(e.target.value) : undefined },
                        })
                      }
                      placeholder="e.g. 20"
                    />
                  </label>
                </>
              )}
            </div>

            <label className="flex items-center gap-2 pt-1 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                className="accent-purple-600 rounded"
                checked={fieldForm.required}
                onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })}
              />
              <span>Field is required for customer checkout</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--hexa-border)] pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="hexa-btn-secondary">
              Cancel
            </button>
            <button className="hexa-btn">
              <HugeiconsIcon icon={Tick02Icon} size={15} /> {editingIndex !== null ? 'Save Field Changes' : 'Add Field'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
