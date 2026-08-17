import type { OrderDraft } from '../types'
import { EMPTY_ORDER } from './mock-data'

export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw === 'string' && raw.trim()) {
    return raw.replace(/\/$/, '')
  }
  return 'http://127.0.0.1:8080'
}

function apiKey(): string {
  const raw = import.meta.env.VITE_API_KEY
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return 'andina-demo-key'
}

export class ParserError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ParserError'
    this.status = status
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

interface ErrorBody {
  error?: string
}

export async function extractOrder(input: {
  rawText?: string
  imageDataUrl?: string | null
}): Promise<ExtractedOrder> {
  const body = buildRequestBody(input)
  const response = await fetch(`${apiBaseUrl()}/v1/parser/extract`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': apiKey(),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new ParserError(await readErrorMessage(response), response.status)
  }

  return (await response.json()) as ExtractedOrder
}

function buildRequestBody(input: { rawText?: string; imageDataUrl?: string | null }) {
  const rawText = input.rawText?.trim()
  if (rawText) return { raw_text: rawText }

  const parsed = splitDataUrl(input.imageDataUrl)
  if (parsed) {
    return { image_base64: parsed.base64, mime_type: parsed.mimeType }
  }

  throw new ParserError('Pega un texto o una captura para extraer el pedido', 400)
}

function splitDataUrl(dataUrl: string | null | undefined): { base64: string; mimeType: string } | null {
  if (!dataUrl?.trim()) return null
  const match = dataUrl.trim().match(/^data:([^;]+);base64,(.+)$/)
  if (match) {
    return { mimeType: match[1], base64: match[2] }
  }
  return { mimeType: 'image/png', base64: dataUrl.trim() }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorBody
    if (typeof body.error === 'string' && body.error.trim()) return body.error
  } catch {
    // ignore non-JSON bodies
  }

  if (response.status === 503) {
    return 'El parser no está configurado (falta GEMINI_API_KEY en el servidor)'
  }
  if (response.status === 429) return 'Cuota de Gemini agotada. Intenta de nuevo en un momento.'
  if (response.status === 401) return 'API key inválida para el parser'
  return `No se pudo extraer el pedido (${response.status})`
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
    clientName: extracted.customer_name?.trim() ?? '',
    clientPhone: extracted.customer_phone?.trim() ?? '',
    paymentMethod: formatPayment(extracted.payment_method),
    amount: formatAmount(extracted.amount),
    notes: extracted.notes?.trim() ?? '',
    serviceTypeId,
  }
}
