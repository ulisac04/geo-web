import type { CostRule, CostRuleDraft, FareEstimate } from '../types'

const COSTS_KEY = 'geo_cost_rules_v1'

export const EMPTY_COST_DRAFT: CostRuleDraft = {
  name: '',
  enabled: true,
  type: 'distance',
  pricePerKm: 2.5,
  startHour: 22,
  endHour: 6,
  surchargeType: 'percent',
  surchargeValue: 20,
}

export const SEED_COST_RULES: CostRule[] = [
  {
    id: 'rule-distance',
    name: 'Tarifa por distancia',
    enabled: true,
    type: 'distance',
    pricePerKm: 2.5,
  },
  {
    id: 'rule-night',
    name: 'Recargo nocturno',
    enabled: true,
    type: 'night',
    startHour: 22,
    endHour: 6,
    surchargeType: 'percent',
    surchargeValue: 20,
  },
]

export function loadCostRules(): CostRule[] {
  const raw = localStorage.getItem(COSTS_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as CostRule[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      localStorage.removeItem(COSTS_KEY)
    }
  }

  localStorage.setItem(COSTS_KEY, JSON.stringify(SEED_COST_RULES))
  return SEED_COST_RULES
}

export function persistCostRules(rules: CostRule[]): void {
  localStorage.setItem(COSTS_KEY, JSON.stringify(rules))
}

export function createCostRule(draft: CostRuleDraft, existing?: CostRule): CostRule {
  const base = {
    id: existing?.id ?? `rule-${Date.now()}`,
    name: draft.name.trim(),
    enabled: draft.enabled,
    type: draft.type,
  }

  if (draft.type === 'distance') {
    return { ...base, pricePerKm: draft.pricePerKm }
  }

  return {
    ...base,
    startHour: draft.startHour,
    endHour: draft.endHour,
    surchargeType: draft.surchargeType,
    surchargeValue: draft.surchargeValue,
  }
}

export function isInNightWindow(hour: number, start: number, end: number): boolean {
  if (start === end) return true
  if (start < end) return hour >= start && hour < end
  return hour >= start || hour < end
}

export function estimateFare(distanceM: number, at: Date, rules: CostRule[]): FareEstimate {
  const distanceKm = distanceM / 1000
  const hour = at.getHours()

  let distanceSubtotal = 0
  for (const rule of rules) {
    if (!rule.enabled || rule.type !== 'distance') continue
    distanceSubtotal += distanceKm * (rule.pricePerKm ?? 0)
  }

  let nightSurcharge = 0
  const appliedNightRules: string[] = []
  for (const rule of rules) {
    if (!rule.enabled || rule.type !== 'night') continue
    const start = rule.startHour ?? 22
    const end = rule.endHour ?? 6
    if (!isInNightWindow(hour, start, end)) continue
    appliedNightRules.push(rule.name)
    if (rule.surchargeType === 'percent') {
      nightSurcharge += distanceSubtotal * ((rule.surchargeValue ?? 0) / 100)
    } else {
      nightSurcharge += rule.surchargeValue ?? 0
    }
  }

  return {
    distanceM,
    distanceKm,
    distanceSubtotal,
    nightSurcharge,
    total: distanceSubtotal + nightSurcharge,
    appliedNightRules,
  }
}

export function formatFare(value: number): string {
  return `$${value.toFixed(2)}`
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function formatRuleSummary(rule: CostRule): string {
  if (rule.type === 'distance') {
    return `${formatFare(rule.pricePerKm ?? 0)} / km`
  }

  const window = `${formatHour(rule.startHour ?? 22)}–${formatHour(rule.endHour ?? 6)}`
  if (rule.surchargeType === 'percent') {
    return `${window} · +${rule.surchargeValue ?? 0}%`
  }
  return `${window} · +${formatFare(rule.surchargeValue ?? 0)}`
}
