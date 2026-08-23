import type { Session } from '../types'
import { api } from './api'
import { clearSession, getSession, isAuthenticated, saveSession } from './session'

export { getSession, isAuthenticated }

interface LoginResponse {
  token: string
  tenant_id: string
  company: string
  operator: string
  operator_email: string
  role?: string
}

export function homePath(session: Session): string {
  return session.role === 'platform_admin' ? '/admin' : '/dashboard'
}

export function isPlatformAdmin(session = getSession()): boolean {
  return session?.role === 'platform_admin'
}

export async function login(email: string, password: string, remember = true): Promise<Session> {
  const data = await api<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
    auth: false,
  })
  const session: Session = {
    token: data.token,
    tenantId: data.tenant_id ?? '',
    company: data.company,
    operator: data.operator,
    operatorEmail: data.operator_email,
    role: data.role === 'platform_admin' ? 'platform_admin' : 'operator',
  }
  saveSession(session, remember)
  return session
}

export function logout(): void {
  clearSession()
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api<void>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim() },
    auth: false,
  })
}
