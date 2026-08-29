import { api, apiBaseUrl } from './api'

export const DEFAULT_PRIMARY_COLOR = '#34d399'
export const DEFAULT_ACCENT_COLOR = '#059669'
export const PLATFORM_TITLE = 'Tu Ruta · Despacho logístico'

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

type Rgb = { r: number; g: number; b: number }

let lastBranding: PublicBranding | null = null
let lastTitle: string | null | undefined

function parseRgb(hex: string): Rgb | null {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return null
  const n = Number.parseInt(raw, 16)
  if (Number.isNaN(n)) return null
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function toHex({ r, g, b }: Rgb): string {
  const ch = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastRatio(a: string, b: string): number {
  const fg = parseRgb(a)
  const bg = parseRgb(b)
  if (!fg || !bg) return 0
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

function mix(from: Rgb, to: Rgb, t: number): Rgb {
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  }
}

/** Darkens a brand color until it reads on a light page background. */
export function readableOnLight(hex: string, bg = '#f4f6f9', minRatio = 4.5): string {
  if (contrastRatio(hex, bg) >= minRatio) return hex
  const from = parseRgb(hex)
  if (!from) return '#047857'
  const black: Rgb = { r: 0, g: 0, b: 0 }
  for (let t = 0.05; t <= 0.9; t += 0.05) {
    const next = toHex(mix(from, black, t))
    if (contrastRatio(next, bg) >= minRatio) return next
  }
  return '#047857'
}

export function contrastOn(hex: string): string {
  const rgb = parseRgb(hex)
  if (!rgb) return '#07090d'
  const y = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return y > 0.55 ? '#07090d' : '#f8fafc'
}

function paintBranding(): void {
  const root = document.documentElement
  const branding = lastBranding
  const name = branding?.name?.trim() || lastTitle?.trim()
  document.title = name || PLATFORM_TITLE
  if (!branding) {
    root.style.removeProperty('--signal')
    root.style.removeProperty('--signal-dim')
    root.style.removeProperty('--on-signal')
    return
  }
  const light = root.classList.contains('light')
  const primary = branding.primary_color
  const accent = branding.accent_color
  if (light) {
    const preferred = contrastRatio(accent, '#f4f6f9') >= contrastRatio(primary, '#f4f6f9') ? accent : primary
    const signal = readableOnLight(preferred)
    root.style.setProperty('--signal', signal)
    root.style.setProperty('--signal-dim', primary)
    root.style.setProperty('--on-signal', contrastOn(signal))
  } else {
    root.style.setProperty('--signal', primary)
    root.style.setProperty('--signal-dim', accent)
    root.style.setProperty('--on-signal', contrastOn(primary))
  }
}

export function applyBranding(branding: PublicBranding | null, title?: string | null): void {
  lastBranding = branding
  lastTitle = title
  paintBranding()
}

export function refreshBrandingColors(): void {
  paintBranding()
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
