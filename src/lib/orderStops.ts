import type { OrderDraft } from '../types'

const PLUS_CODE = '[23456789CFGHJMPQRVWX]{4,8}\\+[23456789CFGHJMPQRVWX]{2,3}'

/** Open Location Code, p. ej. `QQ8C+C44`. No es una dirección. */
export function isPlusCode(value: string): boolean {
  return new RegExp(`^${PLUS_CODE}$`, 'i').test(value.trim())
}

/** Quita códigos de mapa y los separadores que quedan colgando. */
export function withoutPlusCodes(value: string): string {
  return value
    .replace(new RegExp(PLUS_CODE, 'gi'), ' ')
    .replace(/\s*[·|]\s*/g, ' · ')
    .replace(/\s+:\s+/g, ' · ')
    .replace(/(?:\s*·\s*){2,}/g, ' · ')
    .replace(/^(?:\s*·\s*)+|(?:\s*·\s*)+$/g, '')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function formatStopLabel(place: string, exact: string): string {
  return [withoutPlusCodes(place), exact.trim()].filter(Boolean).join(' · ')
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
