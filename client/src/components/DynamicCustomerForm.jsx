import { HugeiconsIcon } from '@hugeicons/react'
import { Alert02Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'

export default function DynamicCustomerForm({ fields = [], values = {}, onChange, errors = {} }) {
  if (!fields || fields.length === 0) return null

  const handleFieldChange = (name, val) => {
    onChange({
      ...values,
      [name]: val,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const key = field.name || field.key
          const label = field.label || key
          const isRequired = Boolean(field.required)
          const errorMsg = errors[key]
          const curVal = values[key] ?? field.defaultValue ?? ''
          const isFullWidth = ['textarea', 'radio', 'checkbox'].includes(field.type) || fields.length === 1

          return (
            <div
              key={key}
              className={`space-y-1.5 ${isFullWidth ? 'sm:col-span-2' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[var(--hexa-text)] flex items-center gap-1">
                  <span>{label}</span>
                  {isRequired && <span className="text-purple-400 font-bold">*</span>}
                </label>
                {field.helpText && (
                  <span className="text-[11px] text-[var(--hexa-muted)] truncate max-w-[200px]" title={field.helpText}>
                    {field.helpText}
                  </span>
                )}
              </div>

              {/* Field Type Specific Controls */}
              {field.type === 'select' ? (
                <div className="relative">
                  <select
                    value={curVal}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className={`hexa-input !h-11 !rounded-xl text-sm ${
                      errorMsg ? '!border-rose-500/80 !bg-rose-500/[0.03]' : ''
                    }`}
                  >
                    <option value="">Choose {label}...</option>
                    {(field.options || []).map((opt, oIdx) => (
                      <option key={oIdx} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ) : field.type === 'radio' ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(field.options || []).map((opt, oIdx) => {
                    const isSelected = curVal === opt
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleFieldChange(key, opt)}
                        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/20 text-white font-bold shadow-sm'
                            : 'border-[var(--hexa-border)] bg-[var(--hexa-card)] text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] hover:border-purple-500/30'
                        }`}
                      >
                        {isSelected && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-purple-400" />}
                        <span>{opt}</span>
                      </button>
                    )
                  })}
                </div>
              ) : field.type === 'toggle' || (field.type === 'checkbox' && !field.options?.length) ? (
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50">
                  <input
                    type="checkbox"
                    className="accent-purple-600 rounded h-4 w-4"
                    checked={Boolean(curVal)}
                    onChange={(e) => handleFieldChange(key, e.target.checked)}
                  />
                  <span className="text-xs font-medium text-[var(--hexa-text)]">{field.placeholder || label}</span>
                </label>
              ) : field.type === 'checkbox' && field.options?.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 pt-1">
                  {field.options.map((opt, oIdx) => {
                    const currentArray = Array.isArray(curVal) ? curVal : []
                    const isChecked = currentArray.includes(opt)
                    return (
                      <label
                        key={oIdx}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition ${
                          isChecked
                            ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                            : 'border-[var(--hexa-border)] bg-[var(--hexa-card)] text-[var(--hexa-muted)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-purple-600 rounded"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleFieldChange(key, [...currentArray, opt])
                            } else {
                              handleFieldChange(key, currentArray.filter((x) => x !== opt))
                            }
                          }}
                        />
                        <span>{opt}</span>
                      </label>
                    )
                  })}
                </div>
              ) : field.type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={curVal}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  placeholder={field.placeholder || `Enter ${label}...`}
                  className={`hexa-input text-xs ${errorMsg ? '!border-rose-500/80 !bg-rose-500/[0.03]' : ''}`}
                />
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                  value={curVal}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  placeholder={field.placeholder || `Enter ${label}...`}
                  className={`hexa-input !h-11 !rounded-xl text-sm ${
                    errorMsg ? '!border-rose-500/80 !bg-rose-500/[0.03]' : ''
                  }`}
                />
              )}

              {/* Error Message Display */}
              {errorMsg && (
                <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                  <HugeiconsIcon icon={Alert02Icon} size={12} />
                  <span>{errorMsg}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
