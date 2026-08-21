import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { loginAdmin, loginUser, logoutUser, registerUser, updateProfile as updateProfileApi } from '../api/auth.api'
import { refreshSessionApi, setAccessToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const applySession = useCallback((session) => {
    setAccessToken(session?.accessToken || '')
    setUser(session?.user || null)
  }, [])

  useEffect(() => {
    let active = true
    refreshSessionApi().then((session) => {
      if (active) applySession(session)
    }).catch(() => {
      if (active) applySession(null)
    }).finally(() => active && setLoading(false))

    const refreshed = (event) => active && applySession(event.detail)
    const expired = () => active && applySession(null)
    window.addEventListener('hexa:session-refreshed', refreshed)
    window.addEventListener('hexa:session-expired', expired)
    return () => {
      active = false
      window.removeEventListener('hexa:session-refreshed', refreshed)
      window.removeEventListener('hexa:session-expired', expired)
    }
  }, [applySession])

  const login = async (payload) => { const session = await loginUser(payload); applySession(session); return session }
  const register = async (payload) => { const session = await registerUser(payload); applySession(session); return session }
  const adminLogin = async (payload) => { const session = await loginAdmin(payload); applySession(session); return session }
  const logout = async () => { try { await logoutUser() } finally { applySession(null) } }
  const updateProfile = async (payload) => { const next = await updateProfileApi(payload); setUser(next); return next }

  const value = { user, loading, isAuthenticated: Boolean(user), isAdmin: user?.role === 'admin', login, register, adminLogin, logout, updateProfile }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
