import type { OrderDraft } from '../types'
import { api, ApiError } from './api'
import { EMPTY_ORDER } from './mock-data'

export class ParserError extends ApiError {
  constructor(message: string, status: number, code = 'ERROR') {
    super(message, status, code)
    this.name = 'ParserError'
  }
}

export interface ExtractedOrder {
  pickup_address: string | null
  dropoff_address: string | null
  customer_name: string | null
  customer_phone: string | null
  payment_method: string | null
  amount: number | null
  notes: string | null
}

export async function extractOrder(input: {
  rawText?: string
  imageDataUrl?: string | null
  audioDataUrl?: string | null
}): Promise<ExtractedOrder> {
  const body = buildRequestBody(input)
  try {
    return await api<ExtractedOrder>('/api/v1/parser/extract', {
      method: 'POST',
      body,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ParserError(error.message, error.status, error.code)
    }
    throw error
  }
}

function buildRequestBody(input: {
  rawText?: string
  imageDataUrl?: string | null
  audioDataUrl?: string | null
}) {
  const rawText = input.rawText?.trim()
  if (rawText) return { raw_text: rawText }

  const image = splitDataUrl(input.imageDataUrl)
  if (image) {
    return { image_base64: image.base64, mime_type: image.mimeType }
  }

  const audio = splitDataUrl(input.audioDataUrl)
  if (audio) {
    return { audio_base64: audio.base64, mime_type: audio.mimeType }
  }

  throw new ParserError('Pega un texto, una captura o un audio para extraer el pedido', 400)
}

export function isBlankExtracted(extracted: ExtractedOrder): boolean {
  const fields = [
    extracted.pickup_address,
    extracted.dropoff_address,
    extracted.customer_name,
    extracted.customer_phone,
    extracted.payment_method,
    extracted.notes,
  ]
  const hasText = fields.some((value) => Boolean(value?.trim()))
  return !hasText && extracted.amount == null
}

function splitDataUrl(dataUrl: string | null | undefined): { base64: string; mimeType: string } | null {
  if (!dataUrl?.trim()) return null
  const trimmed = dataUrl.trim()
  const marker = ';base64,'
  const markerAt = trimmed.indexOf(marker)
  if (trimmed.startsWith('data:') && markerAt > 5) {
    const mimeType = trimmed.slice(5, trimmed.indexOf(';', 5)).trim() || 'application/octet-stream'
    return { mimeType, base64: trimmed.slice(markerAt + marker.length) }
  }
  return { mimeType: 'image/png', base64: trimmed }
}

const PAYMENT_LABELS: Record<string, string> = {
  pago_movil: 'Pago móvil',
  pago_móvil: 'Pago móvil',
  'pago móvil': 'Pago móvil',
  'pago movil': 'Pago móvil',
  efectivo: 'Efectivo',
  zelle: 'Zelle',
  punto: 'Punto',
  transferencia: 'Transferencia',
}

function formatPayment(raw: string | null | undefined): string {
  if (!raw?.trim()) return ''
  const key = raw.trim().toLowerCase().replace(/-/g, '_')
  return PAYMENT_LABELS[key] ?? PAYMENT_LABELS[raw.trim().toLowerCase()] ?? raw.trim()
}

function formatAmount(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return ''
  const rounded = Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
  return `$${rounded}`
}

export function extractedToDraft(
  extracted: ExtractedOrder,
  serviceTypeId = EMPTY_ORDER.serviceTypeId,
): OrderDraft {
  return {
    origin: extracted.pickup_address?.trim() ?? '',
    destination: extracted.dropoff_address?.trim() ?? '',
    originCoords: null,
    destCoords: null,
    originHint: '',
    destHint: '',
    clientName: extracted.customer_name?.trim() ?? '',
    clientPhone: extracted.customer_phone?.trim() ?? '',
    paymentMethod: formatPayment(extracted.payment_method),
    amount: formatAmount(extracted.amount),
    notes: extracted.notes?.trim() ?? '',
    serviceTypeId,
  }
}
