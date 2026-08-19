import { clearSession, getSession } from './session'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code = 'ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw === 'string' && raw.trim()) {
    return raw.replace(/\/$/, '')
  }
  return 'http://127.0.0.1:8080'
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
  query?: Record<string, string | number | boolean | undefined | null>
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth !== false
  const url = new URL(`${apiBaseUrl()}${path}`)
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (auth) {
    const token = getSession()?.token
    if (!token) {
      throw new ApiError('Sesión expirada', 401, 'UNAUTHORIZED')
    }
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (response.status === 204) {
    return undefined as T
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    throw await readApiError(response)
  }

  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

async function readApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as {
      error?: string | { code?: string; message?: string }
    }
    if (typeof body.error === 'string' && body.error.trim()) {
      return new ApiError(body.error, response.status)
    }
    if (body.error && typeof body.error === 'object') {
      const message = body.error.message?.trim()
      if (message) {
        return new ApiError(message, response.status, body.error.code ?? 'ERROR')
      }
    }
  } catch {
    // ignore non-JSON bodies
  }
  return new ApiError(fallbackMessage(response.status), response.status)
}

function fallbackMessage(status: number): string {
  if (status === 401) return 'Sesión inválida o expirada'
  if (status === 403) return 'No tienes acceso a este tenant'
  if (status === 404) return 'No se encontró el recurso'
  if (status === 409) return 'La operación entra en conflicto con el estado actual'
  if (status === 429) return 'Cuota de Gemini agotada. Intenta de nuevo en un momento.'
  if (status === 503) return 'El parser no está configurado (falta GEMINI_API_KEY en el servidor)'
  return `Error del servidor (${status})`
}
