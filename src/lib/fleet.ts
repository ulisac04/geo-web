import type { Driver, DriverDraft } from '../types'
import { CITY_CENTER, getFleet, resolvePlace } from './mock-data'

const FLEET_KEY = 'geo_fleet_v2'

function withDefaults(driver: Driver): Driver {
  return {
    ...driver,
    zone: driver.zone ?? '',
    notes: driver.notes ?? '',
    distanceM: driver.distanceM ?? 0,
    etaMin: driver.etaMin ?? 0,
  }
}

export function loadFleet(): Driver[] {
  const raw = localStorage.getItem(FLEET_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Driver[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(withDefaults)
      }
    } catch {
      localStorage.removeItem(FLEET_KEY)
    }
  }

  const initial = getFleet()
  localStorage.setItem(FLEET_KEY, JSON.stringify(initial))
  return initial
}

export function persistFleet(drivers: Driver[]): void {
  localStorage.setItem(FLEET_KEY, JSON.stringify(drivers))
}

export function coordsForZone(zone: string): [number, number] {
  return (
    resolvePlace(zone) ?? [
      CITY_CENTER[0] + (Math.random() - 0.5) * 0.018,
      CITY_CENTER[1] + (Math.random() - 0.5) * 0.018,
    ]
  )
}

export function createDriver(draft: DriverDraft, existing?: Driver): Driver {
  return {
    id: existing?.id ?? `drv-${Date.now()}`,
    name: draft.name.trim(),
    phone: draft.phone.replace(/\D/g, ''),
    vehicle: draft.vehicle.trim(),
    status: draft.status,
    zone: draft.zone.trim(),
    notes: draft.notes.trim(),
    coords: existing?.coords ?? coordsForZone(draft.zone),
    battery: existing?.battery ?? 80,
    distanceM: 0,
    etaMin: 0,
  }
}

export const EMPTY_DRAFT: DriverDraft = {
  name: '',
  phone: '',
  vehicle: '',
  status: 'available',
  zone: '',
  notes: '',
}

export const ZONES = [
  'Altamira',
  'Chacao',
  'La Castellana',
  'Las Mercedes',
  'Los Palos Grandes',
  'El Rosal',
  'Plaza Venezuela',
  'El Hatillo',
  'La California',
  'San Bernardino',
]
