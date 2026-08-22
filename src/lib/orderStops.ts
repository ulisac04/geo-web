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

export function formatStopLines(title: string, place: string, exact: string): string[] {
  const lines = [`${title}: ${place.trim()}`]
  if (exact.trim()) lines.push(`   Punto exacto: ${exact.trim()}`)
  return lines
}
