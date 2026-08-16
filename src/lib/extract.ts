import type { OrderDraft } from '../types'
import { EMPTY_ORDER, resolvePlace, SAMPLE_WHATSAPP } from './mock-data'

function capture(text: string, pattern: RegExp): string {
  return text.match(pattern)?.[1]?.trim() ?? ''
}

function stripMoneyPrefix(value: string): { method: string; amount: string } {
  const amountMatch = value.match(/(\$?\s?\d+[.,]?\d*)/)
  const amount = amountMatch?.[1]?.replace(/\s/g, '') ?? ''
  const method = value.replace(amountMatch?.[0] ?? '', '').replace(/[-–—]/g, '').trim()
  return {
    method: method || 'Efectivo',
    amount: amount || '$15',
  }
}

export function extractOrderFromText(raw: string): OrderDraft {
  const text = raw.trim() || SAMPLE_WHATSAPP

  const origin =
    capture(text, /(?:de|origen|punto a|recogida)\s*[:\-]\s*(.+)/i) ||
    'Av. Francisco de Miranda, Altamira'
  const destination =
    capture(text, /(?:hasta|destino|punto b|a)\s*[:\-]\s*(.+)/i) ||
    'CC Sambil, Chacao'
  const clientName =
    capture(text, /(?:cliente|nombre)\s*[:\-]\s*(.+)/i) || 'María González'
  const clientPhone =
    capture(text, /(?:tel(?:éfono)?|cel|whats?app)\s*[:\-]\s*([+\d][\d\s-]{6,})/i) ||
    '0412-555-0189'
  const paymentRaw =
    capture(text, /(?:pago|método|monto)\s*[:\-]\s*(.+)/i) || 'Efectivo $15'
  const { method, amount } = stripMoneyPrefix(paymentRaw)

  return {
    origin,
    destination,
    originCoords: resolvePlace(origin) ?? [-66.8531, 10.4984],
    destCoords: resolvePlace(destination) ?? [-66.8546, 10.4888],
    clientName,
    clientPhone: clientPhone.replace(/\s+/g, ' '),
    paymentMethod: method,
    amount,
    serviceTypeId: EMPTY_ORDER.serviceTypeId,
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export { EMPTY_ORDER }
