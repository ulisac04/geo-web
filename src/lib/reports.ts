import { api } from './api'

export type HeatmapKind = 'origin' | 'destination' | 'both'

export type HeatmapPointKind = 'origin' | 'destination'

export interface HeatmapPoint {
  lat: number
  lng: number
  kind: HeatmapPointKind
}

export interface HeatmapResponse {
  kind: HeatmapKind
  from: string
  to: string
  services: number
  with_coords: number
  points: HeatmapPoint[]
}

export function fetchHeatmap(query: {
  from: string
  to: string
  kind: HeatmapKind
  cityId: string
  signal?: AbortSignal
}): Promise<HeatmapResponse> {
  return api<HeatmapResponse>('/api/v1/reports/heatmap', {
    signal: query.signal,
    query: {
      from: query.from,
      to: query.to,
      kind: query.kind,
      city_id: query.cityId,
    },
  })
}

export function rangeDaysIso(days: number, now = new Date()): { from: string; to: string } {
  const to = now
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function toDateInputValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateInputRange(fromDate: string, toDate: string): { from: string; to: string } {
  const [fromY, fromM, fromD] = fromDate.split('-').map(Number)
  const [toY, toM, toD] = toDate.split('-').map(Number)
  const from = new Date(fromY, fromM - 1, fromD, 0, 0, 0, 0)
  const to = new Date(toY, toM - 1, toD + 1, 0, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString() }
}
