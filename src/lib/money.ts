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

export function formatDispatchAmount(
  usdRaw: string,
  rates?: { usdToCop: number; usdToVes: number },
): string {
  const usd = parseUsd(usdRaw)
  const usdLabel = usd == null ? usdRaw.trim() : formatMoney(usd)
  if (!usdLabel) return ''
  const parts = [`💵 USD ${usdLabel}`]
  if (rates && usd != null) {
    const cop = convertFromUsd(usdRaw, rates.usdToCop)
    const ves = convertFromUsd(usdRaw, rates.usdToVes)
    if (cop) parts.push(`🇨🇴 COP ${cop}`)
    if (ves) parts.push(`🇻🇪 VES ${ves}`)
  }
  return parts.join(' · ')
}

