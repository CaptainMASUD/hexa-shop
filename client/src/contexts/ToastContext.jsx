import { createContext, useContext, useState } from 'react'
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa'

const ToastContext = createContext(null)
let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const notify = (message, type = 'success') => {
    const id = ++toastId
    setToasts((items) => [...items, { id, message, type }])
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3500)
  }
  const remove = (id) => setToasts((items) => items.filter((item) => item.id !== id))
  const value = { notify }
  const icons = { success: FaCheckCircle, error: FaExclamationCircle, info: FaInfoCircle }
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-24 z-[100] flex w-[min(360px,calc(100%-2rem))] flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || FaInfoCircle
          return <div key={toast.id} className="hexa-panel flex items-start gap-3 px-4 py-3 shadow-2xl"><Icon className="mt-0.5 text-purple-400"/><p className="flex-1 text-sm text-gray-100">{toast.message}</p><button onClick={() => remove(toast.id)} aria-label="Dismiss"><FaTimes/></button></div>
        })}
      </div>
    </ToastContext.Provider>
  )
}
export const useToast = () => {
  const context = useContext(ToastContext)
  return context || { notify: () => {} }
}
