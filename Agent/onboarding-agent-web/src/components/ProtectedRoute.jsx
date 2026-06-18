import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">Loading…</div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/login" replace state={{ forbidden: true }} />
  }
  return children
}

export function AdminRoute({ children }) {
  return <ProtectedRoute roles={['ADMIN']}>{children}</ProtectedRoute>
}
