import type { OrderDraft } from '../types'

export function formatStopLabel(place: string, exact: string): string {
  return [place.trim(), exact.trim()].filter(Boolean).join(' · ')
}

export function formatOriginLabel(order: OrderDraft): string {
  return formatStopLabel(order.origin, order.originExact)
}

export function formatDestLabel(order: OrderDraft): string {
  return formatStopLabel(order.destination, order.destExact)
}

/** WhatsApp: solo el punto que escribe el operador, no la etiqueta de Maps. */
export function formatStopLines(title: string, exact: string): string[] {
  const text = exact.trim()
  if (!text) return []
  return [`${title}: ${text}`]
}
