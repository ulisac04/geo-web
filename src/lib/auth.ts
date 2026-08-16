import type { Session } from '../types'

const TOKEN_KEY = 'geo_jwt'
const TENANT_KEY = 'geo_tenant_id'
const SESSION_KEY = 'geo_session'

const DEMO_TENANT = 'tenant_andina_001'
const DEMO_COMPANY = 'Andina Logistics'
const DEMO_OPERATOR = 'Carlos Méndez'

function mockJwt(email: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({
      sub: email,
      tenant_id: DEMO_TENANT,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    }),
  )
  return `${header}.${payload}.mock-signature`
}

export function login(email: string, _password: string): Session {
  const session: Session = {
    token: mockJwt(email),
    tenantId: DEMO_TENANT,
    company: DEMO_COMPANY,
    operator: DEMO_OPERATOR,
    operatorEmail: email,
  }

  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(TENANT_KEY, session.tenantId)
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TENANT_KEY)
  localStorage.removeItem(SESSION_KEY)
}

export function getSession(): Session | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const tenantId = localStorage.getItem(TENANT_KEY)
  const raw = localStorage.getItem(SESSION_KEY)

  if (!token || !tenantId) return null

  if (raw) {
    try {
      return JSON.parse(raw) as Session
    } catch {
      return null
    }
  }

  return {
    token,
    tenantId,
    company: DEMO_COMPANY,
    operator: DEMO_OPERATOR,
    operatorEmail: 'operador@andina.logistic',
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}

export function requestPasswordReset(_email: string): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 700)
  })
}
