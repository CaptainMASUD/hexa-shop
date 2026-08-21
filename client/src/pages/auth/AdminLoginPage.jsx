import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BsHexagonFill } from 'react-icons/bs'
import { FaShieldAlt } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { apiErrorMessage } from '../../api/client'

export default function AdminLoginPage() {
  const [form, setForm] = useState({ username: '', adminCode: '' })
  const [busy, setBusy] = useState(false)
  const { adminLogin } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await adminLogin(form)
      notify('Admin authenticated successfully')
      navigate('/admin')
    } catch (error) {
      notify(apiErrorMessage(error, 'Unable to sign in'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hexa-shell flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10">
            <BsHexagonFill className="text-4xl text-purple-600" />
          </div>
          <h1 className="mt-5 text-3xl font-bold">HEXA Admin</h1>
          <p className="mt-2 text-sm text-gray-500">
            Protected administrator access with server-side credential verification.
          </p>
        </div>

        <form onSubmit={submit} className="hexa-card mt-7 space-y-5 p-7">
          <label className="block">
            <span className="hexa-label">Admin username</span>
            <input
              autoComplete="username"
              className="hexa-input"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. admin"
            />
          </label>

          <label className="block">
            <span className="hexa-label">
              {form.username.trim() ? 'Admin Login Code / Password' : 'Password / Admin Login Code'}
            </span>
            <input
              autoComplete="current-password"
              type="password"
              className="hexa-input"
              required
              value={form.adminCode}
              onChange={(e) => setForm({ ...form, adminCode: e.target.value })}
              placeholder="••••••••••••"
            />
            <p className="mt-2 text-xs leading-5 text-[var(--hexa-muted)]">
              Credential check is strictly verified on the backend server.
            </p>
          </label>

          <button disabled={busy} className="hexa-btn w-full justify-center">
            <FaShieldAlt /> {busy ? 'Verifying credentials…' : 'Secure admin login'}
          </button>
        </form>
      </div>
    </div>
  )
}
