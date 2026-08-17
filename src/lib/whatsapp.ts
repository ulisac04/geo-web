import type { Driver, OrderDraft } from '../types'

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

export function buildWhatsAppUrl(order: OrderDraft, driver: Driver): string {
  const phone = driver.phone.replace(/\D/g, '')
  const text = encodeURIComponent(buildDispatchMessage(order, driver))
  return `https://wa.me/${phone}?text=${text}`
}
