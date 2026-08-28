import type { ChargeCurrency, OrderDraft } from '../types'

export type ExchangeRates = { usdToCop: number; usdToVes: number }

type AmountDraft = Pick<OrderDraft, 'amount' | 'amountCop' | 'amountVes'>
type ChargeDraft = AmountDraft & Pick<OrderDraft, 'chargeCurrency'>

export function parseUsd(raw: string): number | null {
  const normalized = raw.trim().replace(/\$/g, '').replace(/,/g, '.')
  if (!normalized) return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

export function formatMoney(value: number, fractionDigits = 2): string {
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

export function convertFromUsd(usdRaw: string, rate: number): string {
  const usd = parseUsd(usdRaw)
  if (usd == null || !Number.isFinite(rate) || rate <= 0) return ''
  return formatMoney(usd * rate)
}

export function localAmountsFromUsd(usdRaw: string, rates: ExchangeRates): Pick<OrderDraft, 'amountCop' | 'amountVes'> {
  return {
    amountCop: convertFromUsd(usdRaw, rates.usdToCop),
    amountVes: convertFromUsd(usdRaw, rates.usdToVes),
  }
}

function usdLabel(usdRaw: string): string {
  const usd = parseUsd(usdRaw)
  return usd == null ? usdRaw.trim() : formatMoney(usd)
}

function resolvedCop(order: AmountDraft, rates?: ExchangeRates): string {
  const edited = order.amountCop.trim()
  if (edited) return edited
  return rates ? convertFromUsd(order.amount, rates.usdToCop) : ''
}

function resolvedVes(order: AmountDraft, rates?: ExchangeRates): string {
  const edited = order.amountVes.trim()
  if (edited) return edited
  return rates ? convertFromUsd(order.amount, rates.usdToVes) : ''
}

export function formatDispatchAmount(order: AmountDraft, rates?: ExchangeRates): string {
  const usd = usdLabel(order.amount)
  if (!usd) return ''
  const parts = [`💵 USD ${usd}`]
  const cop = resolvedCop(order, rates)
  const ves = resolvedVes(order, rates)
  if (cop) parts.push(`🇨🇴 COP ${cop}`)
  if (ves) parts.push(`🇻🇪 VES ${ves}`)
  return parts.join(' · ')
}

export function formatClientAmount(order: ChargeDraft, rates?: ExchangeRates): string {
  const currency: ChargeCurrency = order.chargeCurrency || 'VES'
  if (currency === 'USD') {
    const usd = usdLabel(order.amount)
    return usd ? `💵 USD ${usd}` : ''
  }
  if (currency === 'COP') {
    const cop = resolvedCop(order, rates)
    return cop ? `🇨🇴 COP ${cop}` : ''
  }
  const ves = resolvedVes(order, rates)
  return ves ? `🇻🇪 VES ${ves}` : ''
}
