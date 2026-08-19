import type { CostRule, CostRuleDraft, FareEstimate } from '../types'
import { api } from './api'

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

interface ApiCostRule {
  id: string
  name: string
  enabled: boolean
  type: CostRule['type']
  price_per_km?: number | null
  start_hour?: number | null
  end_hour?: number | null
  surcharge_type?: CostRule['surchargeType'] | null
  surcharge_value?: number | null
}

interface RulesResponse {
  items: ApiCostRule[]
}

interface ApiFareEstimate {
  distance_m: number
  distance_km: number
  distance_subtotal: number
  night_surcharge: number
  total: number
  applied_night_rules: string[]
}

function fromApi(rule: ApiCostRule): CostRule {
  return {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    type: rule.type,
    pricePerKm: rule.price_per_km ?? undefined,
    startHour: rule.start_hour ?? undefined,
    endHour: rule.end_hour ?? undefined,
    surchargeType: rule.surcharge_type ?? undefined,
    surchargeValue: rule.surcharge_value ?? undefined,
  }
}

function draftBody(draft: CostRuleDraft) {
  if (draft.type === 'distance') {
    return {
      name: draft.name.trim(),
      enabled: draft.enabled,
      type: draft.type,
      price_per_km: draft.pricePerKm,
    }
  }
  return {
    name: draft.name.trim(),
    enabled: draft.enabled,
    type: draft.type,
    start_hour: draft.startHour,
    end_hour: draft.endHour,
    surcharge_type: draft.surchargeType,
    surcharge_value: draft.surchargeValue,
  }
}

export async function fetchCostRules(): Promise<CostRule[]> {
  const data = await api<RulesResponse>('/api/v1/cost-rules')
  return data.items.map(fromApi)
}

export async function createCostRule(draft: CostRuleDraft): Promise<CostRule> {
  const created = await api<ApiCostRule>('/api/v1/cost-rules', {
    method: 'POST',
    body: draftBody(draft),
  })
  return fromApi(created)
}

export async function updateCostRule(id: string, draft: CostRuleDraft): Promise<CostRule> {
  const updated = await api<ApiCostRule>(`/api/v1/cost-rules/${id}`, {
    method: 'PATCH',
    body: draftBody(draft),
  })
  return fromApi(updated)
}

export async function patchCostRuleEnabled(id: string, enabled: boolean): Promise<CostRule> {
  const updated = await api<ApiCostRule>(`/api/v1/cost-rules/${id}`, {
    method: 'PATCH',
    body: { enabled },
  })
  return fromApi(updated)
}

export async function deleteCostRule(id: string): Promise<void> {
  await api<void>(`/api/v1/cost-rules/${id}`, { method: 'DELETE' })
}

function fromFare(data: ApiFareEstimate): FareEstimate {
  return {
    distanceM: data.distance_m,
    distanceKm: data.distance_km,
    distanceSubtotal: data.distance_subtotal,
    nightSurcharge: data.night_surcharge,
    total: data.total,
    appliedNightRules: data.applied_night_rules ?? [],
  }
}

export async function requestFareEstimate(input: {
  distanceM: number
  originCoords?: [number, number] | null
  destCoords?: [number, number] | null
  at?: Date
}): Promise<FareEstimate> {
  const data = await api<ApiFareEstimate>('/api/v1/cost-rules/estimate', {
    method: 'POST',
    body: {
      distance_m: Math.round(input.distanceM),
      origin_lng: input.originCoords?.[0],
      origin_lat: input.originCoords?.[1],
      dest_lng: input.destCoords?.[0],
      dest_lat: input.destCoords?.[1],
      at: input.at?.toISOString(),
    },
  })
  return fromFare(data)
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
