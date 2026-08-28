import type { Driver, OrderDraft } from '../types'
import { formatClientAmount, formatDispatchAmount, type ExchangeRates } from './money'
import { formatStopLines } from './orderStops'
import { formatVehicleLine } from './vehicles'
import { toWhatsAppDigits } from './phone'

export const WHATSAPP_TOKENS = [
  { token: '{conductor}', label: 'Conductor' },
  { token: '{tel_conductor}', label: 'Tel. conductor' },
  { token: '{vehiculo}', label: 'Vehículo' },
  { token: '{placa}', label: 'Placa' },
  { token: '{cliente}', label: 'Cliente' },
  { token: '{tel_cliente}', label: 'Tel. cliente' },
  { token: '{recogida}', label: 'Recogida' },
  { token: '{destino}', label: 'Destino' },
  { token: '{monto}', label: 'Monto' },
  { token: '{notas}', label: 'Notas' },
  { token: '{firma}', label: 'Firma' },
  { token: '{seguimiento}', label: 'Link seguimiento' },
] as const

export const DEFAULT_DRIVER_TEMPLATE = [
  'Hola {conductor}, tienes un servicio asignado:',
  '',
  '{recogida}',
  '{destino}',
  '👤 Cliente: {cliente}',
  '📞 Tel: {tel_cliente}',
  '{monto}',
  '📝 {notas}',
  '',
  'Tu Ruta · Despacho',
].join('\n')

export const DEFAULT_CLIENT_TEMPLATE = [
  'Hola {cliente}, tu servicio fue asignado.',
  '',
  '🚗 Conductor: {conductor}',
  '📞 Tel: {tel_conductor}',
  '{vehiculo}',
  '',
  '{recogida}',
  '{destino}',
  '',
  '{monto}',
  '',
  'Seguí al conductor: {seguimiento}',
  '',
  'Tu Ruta',
].join('\n')

export type TemplateVars = Record<string, string>

const TOKEN_RE = /\{([a-z_]+)\}/g

export function resolveWhatsAppTemplate(template: string | undefined, fallback: string): string {
  return template?.trim() ? template : fallback
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  const out: string[] = []
  for (const line of template.replace(/\r\n/g, '\n').split('\n')) {
    let drop = false
    for (const match of line.matchAll(TOKEN_RE)) {
      const key = match[1]
      if (Object.prototype.hasOwnProperty.call(vars, key) && !vars[key]) {
        drop = true
        break
      }
    }
    if (drop) continue
    const rendered = line.replace(TOKEN_RE, (all, key: string) => {
      if (Object.prototype.hasOwnProperty.call(vars, key)) return vars[key]
      return all
    })
    out.push(...rendered.split('\n'))
  }
  const collapsed: string[] = []
  for (const line of out) {
    const blank = !line.trim()
    if (blank && collapsed.length > 0 && !collapsed[collapsed.length - 1]?.trim()) continue
    collapsed.push(blank ? '' : line)
  }
  while (collapsed.length && !collapsed[0]?.trim()) collapsed.shift()
  while (collapsed.length && !collapsed[collapsed.length - 1]?.trim()) collapsed.pop()
  return collapsed.join('\n')
}

function vehicleLabel(driver: Driver): string {
  const vehicle = formatVehicleLine(driver.vehicleType, driver.vehicle)
  const plate = driver.licensePlate.trim()
  return plate ? `${vehicle} · ${plate}` : vehicle
}

export function clientTrackingUrl(
  shareToken: string | null | undefined,
  origin = typeof window !== 'undefined' ? window.location.origin : '',
): string {
  const token = shareToken?.trim()
  if (!token) return ''
  return `${origin.replace(/\/$/, '')}/s/${token}`
}

export function buildWhatsAppVars(
  order: OrderDraft,
  driver: Driver,
  rates?: ExchangeRates,
  extras?: { seguimiento?: string; client?: boolean },
): TemplateVars {
  return {
    conductor: driver.name.trim(),
    tel_conductor: driver.phone.trim(),
    vehiculo: vehicleLabel(driver),
    placa: driver.licensePlate.trim(),
    cliente: order.clientName.trim(),
    tel_cliente: order.clientPhone.trim(),
    recogida: formatStopLines('📍 Recogida', order.originExact).join('\n'),
    destino: formatStopLines('🎯 Destino', order.destExact).join('\n'),
    monto: extras?.client ? formatClientAmount(order, rates) : formatDispatchAmount(order, rates),
    notas: order.notes.trim(),
    firma: 'Tu Ruta',
    seguimiento: extras?.seguimiento?.trim() ?? '',
  }
}

export function buildDispatchMessage(
  order: OrderDraft,
  driver: Driver,
  rates?: ExchangeRates,
  template?: string,
): string {
  return renderTemplate(
    resolveWhatsAppTemplate(template, DEFAULT_DRIVER_TEMPLATE),
    buildWhatsAppVars(order, driver, rates),
  )
}

export function buildClientMessage(
  order: OrderDraft,
  driver: Driver,
  template?: string,
  seguimiento?: string,
  rates?: ExchangeRates,
): string {
  return renderTemplate(
    resolveWhatsAppTemplate(template, DEFAULT_CLIENT_TEMPLATE),
    buildWhatsAppVars(order, driver, rates, { seguimiento, client: true }),
  )
}

export function buildDriverInviteMessage(name: string, inviteCode: string): string {
  const code = inviteCode.trim() || '—'
  return `Hola ${name}, pega este código en Geo y prende el GPS:\n${code}`
}

export function buildWhatsAppUrlForPhone(phone: string, text: string): string {
  const digits = toWhatsAppDigits(phone)
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function buildDriverInviteWhatsAppUrl(phone: string, name: string, inviteCode: string): string {
  return buildWhatsAppUrlForPhone(phone, buildDriverInviteMessage(name, inviteCode))
}

export function buildWhatsAppUrl(
  order: OrderDraft,
  driver: Driver,
  rates?: ExchangeRates,
  template?: string,
): string {
  return buildWhatsAppUrlForPhone(
    driver.phone,
    buildDispatchMessage(order, driver, rates, template),
  )
}

export function buildClientWhatsAppUrl(
  order: OrderDraft,
  driver: Driver,
  template?: string,
  seguimiento?: string,
  rates?: ExchangeRates,
): string {
  return buildWhatsAppUrlForPhone(
    order.clientPhone,
    buildClientMessage(order, driver, template, seguimiento, rates),
  )
}

export function openWhatsAppPopup(): Window | null {
  try {
    return window.open('about:blank', '_blank')
  } catch {
    return null
  }
}

export async function copyAndOpenWhatsApp(
  url: string,
  message: string,
  popup?: Window | null,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(message)
  } catch {
    // El bloqueo del portapapeles no impide abrir WhatsApp.
  }
  if (popup && !popup.closed) {
    popup.location.href = url
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
