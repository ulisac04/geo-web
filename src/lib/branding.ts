import { api, apiBaseUrl } from './api'

export const DEFAULT_PRIMARY_COLOR = '#34d399'
export const DEFAULT_ACCENT_COLOR = '#059669'
export const PLATFORM_TITLE = 'Andina Dispatch · Despacho logístico'

export interface PublicBranding {
  code: string
  name: string
  primary_color: string
  accent_color: string
  subdomain: string | null
  logo_url: string | null
}

export function appBaseHost(): string {
  const raw = import.meta.env.VITE_APP_BASE_HOST
  return typeof raw === 'string' ? raw.replace(/^www\./, '').trim().toLowerCase() : ''
}

export function tenantSlugFromHost(hostname = window.location.hostname): string | null {
  const host = hostname.split(':')[0].toLowerCase()
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null
  const base = appBaseHost()
  if (base && (host === base || host === `www.${base}`)) return null
  if (base && host.endsWith(`.${base}`)) {
    return host.slice(0, -(base.length + 1)).split('.')[0] || null
  }
  if (host.endsWith('.localhost')) {
    const slug = host.slice(0, -'.localhost'.length)
    return slug || null
  }
  return null
}

export function contrastOn(hex: string): string {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return '#07090d'
  const n = Number.parseInt(raw, 16)
  if (Number.isNaN(n)) return '#07090d'
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const y = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return y > 0.55 ? '#07090d' : '#f8fafc'
}

export function applyBranding(branding: PublicBranding | null, title?: string | null): void {
  const root = document.documentElement
  const name = branding?.name?.trim() || title?.trim()
  document.title = name || PLATFORM_TITLE
  if (!branding) {
    root.style.removeProperty('--signal')
    root.style.removeProperty('--signal-dim')
    root.style.removeProperty('--on-signal')
    return
  }
  root.style.setProperty('--signal', branding.primary_color)
  root.style.setProperty('--signal-dim', branding.accent_color)
  root.style.setProperty('--on-signal', contrastOn(branding.primary_color))
}

export function logoSrc(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) return logoUrl
  return `${apiBaseUrl()}${logoUrl}`
}

export async function fetchPublicBranding(query: {
  code?: string
  host?: string
}): Promise<PublicBranding | null> {
  try {
    return await api<PublicBranding>('/api/v1/public/branding', {
      auth: false,
      query,
    })
  } catch {
    return null
  }
}
