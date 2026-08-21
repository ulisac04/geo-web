import type { Driver, OrderDraft } from '../types'
import { formatVehicleLine } from './vehicles'

export function buildDispatchMessage(order: OrderDraft, driver: Driver): string {
  return [
    `Hola ${driver.name}, tienes un servicio asignado:`,
    '',
    `📍 Recogida: ${order.origin}`,
    `🎯 Destino: ${order.destination}`,
    `👤 Cliente: ${order.clientName}`,
    `📞 Tel: ${order.clientPhone}`,
    `💳 Pago: ${order.paymentMethod} — ${order.amount}`,
    ...(order.notes.trim() ? ['', `📝 ${order.notes.trim()}`] : []),
    '',
    'Andina Logistics · Despacho',
  ].join('\n')
}

export function buildClientMessage(order: OrderDraft, driver: Driver): string {
  const vehicle = formatVehicleLine(driver.vehicleType, driver.vehicle)
  const plate = driver.licensePlate.trim()
  return [
    `Hola ${order.clientName}, tu servicio fue asignado.`,
    '',
    `🚗 Conductor: ${driver.name}`,
    `📞 Tel: ${driver.phone}`,
    plate ? `${vehicle} · ${plate}` : vehicle,
    '',
    `📍 Recogida: ${order.origin}`,
    `🎯 Destino: ${order.destination}`,
    '',
    'Andina Logistics',
  ].join('\n')
}

export function buildWhatsAppUrlForPhone(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function buildWhatsAppUrl(order: OrderDraft, driver: Driver): string {
  return buildWhatsAppUrlForPhone(driver.phone, buildDispatchMessage(order, driver))
}

export function buildClientWhatsAppUrl(order: OrderDraft, driver: Driver): string {
  return buildWhatsAppUrlForPhone(order.clientPhone, buildClientMessage(order, driver))
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
