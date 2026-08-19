import type { Session } from '../types'

const TOKEN_KEY = 'geo_jwt'
const TENANT_KEY = 'geo_tenant_id'
const SESSION_KEY = 'geo_session'

function storage(persist: boolean): Storage {
  return persist ? localStorage : sessionStorage
}

function readFrom(store: Storage): Session | null {
  const token = store.getItem(TOKEN_KEY)
  const tenantId = store.getItem(TENANT_KEY)
  const raw = store.getItem(SESSION_KEY)
  if (!token || !tenantId) return null
  if (raw) {
    try {
      return JSON.parse(raw) as Session
    } catch {
      return null
    }
  }
  return null
}

export function getSession(): Session | null {
  return readFrom(sessionStorage) ?? readFrom(localStorage)
}

export function saveSession(session: Session, persist = true): void {
  clearSession()
  const store = storage(persist)
  store.setItem(TOKEN_KEY, session.token)
  store.setItem(TENANT_KEY, session.tenantId)
  store.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(TOKEN_KEY)
    store.removeItem(TENANT_KEY)
    store.removeItem(SESSION_KEY)
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}
