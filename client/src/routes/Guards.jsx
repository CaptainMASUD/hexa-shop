import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import PageLoader from '../components/PageLoader'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  return <Outlet />
}

export function AdminRoute() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />
  return <Outlet />
}

export function GuestRoute() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/account'} replace />
  return <Outlet />
}
