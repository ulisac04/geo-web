import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { getSession, homePath, isAuthenticated } from '../lib/auth'

export default function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode
  role?: 'operator' | 'platform_admin'
}) {
  const session = getSession()
  if (!isAuthenticated() || !session) {
    return <Navigate to="/login" replace />
  }
  if (role && session.role !== role) {
    return <Navigate to={homePath(session)} replace />
  }
  return children
}
