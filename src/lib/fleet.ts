import type { CityId, Driver, DriverDraft, DriverStatus, VehicleType } from '../types'
import { api } from './api'
import { etaFromMeters, haversineMeters } from './geo'

export const NEARBY_RADIUS_M = 1500

export const EMPTY_DRAFT: DriverDraft = {
  name: '',
  phone: '',
  vehicleType: 'motorcycle',
  vehicle: '',
  licensePlate: '',
  driverPhoto: '',
  vehiclePhoto: '',
  status: 'available',
  zone: '',
  notes: '',
}

interface ApiDriver {
  id: string
  name: string
  phone: string
  vehicle_type: VehicleType
  vehicle: string
  license_plate: string
  driver_photo: string
  vehicle_photo: string
  status: DriverStatus
  zone: string
  notes: string
  city_id: CityId
  lng: number
  lat: number
  coords: [number, number]
  battery: number | null
  updated_at: string
}

interface FleetResponse {
  items: ApiDriver[]
}

function fromApi(driver: ApiDriver, extra?: { distanceM?: number; etaMin?: number }): Driver {
  const coords = Array.isArray(driver.coords) ? driver.coords : [driver.lng, driver.lat]
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    vehicleType: driver.vehicle_type,
    vehicle: driver.vehicle,
    licensePlate: driver.license_plate,
    driverPhoto: driver.driver_photo ?? '',
    vehiclePhoto: driver.vehicle_photo ?? '',
    status: driver.status,
    coords: [coords[0], coords[1]],
    battery: driver.battery ?? 0,
    distanceM: extra?.distanceM ?? 0,
    etaMin: extra?.etaMin ?? 0,
    zone: driver.zone ?? '',
    notes: driver.notes ?? '',
    cityId: driver.city_id,
  }
}

function draftBody(draft: DriverDraft, cityId?: CityId) {
  return {
    name: draft.name.trim(),
    phone: draft.phone.replace(/\D/g, ''),
    vehicle_type: draft.vehicleType,
    vehicle: draft.vehicle.trim(),
    license_plate: draft.licensePlate.trim().toUpperCase(),
    driver_photo: draft.driverPhoto,
    vehicle_photo: draft.vehiclePhoto,
    status: draft.status,
    zone: draft.zone.trim(),
    notes: draft.notes.trim(),
    city_id: cityId,
  }
}

export async function fetchDrivers(query?: {
  cityId?: CityId
  status?: DriverStatus
  q?: string
}): Promise<Driver[]> {
  const data = await api<FleetResponse>('/api/v1/drivers', {
    query: { city_id: query?.cityId, status: query?.status, q: query?.q },
  })
  return data.items.map((item) => fromApi(item))
}

export async function createDriver(draft: DriverDraft, cityId: CityId): Promise<Driver> {
  const created = await api<ApiDriver>('/api/v1/drivers', {
    method: 'POST',
    body: draftBody(draft, cityId),
  })
  return fromApi(created)
}

export async function updateDriver(id: string, draft: DriverDraft): Promise<Driver> {
  const updated = await api<ApiDriver>(`/api/v1/drivers/${id}`, {
    method: 'PATCH',
    body: draftBody(draft),
  })
  return fromApi(updated)
}

export async function patchDriverStatus(id: string, status: DriverStatus): Promise<Driver> {
  const updated = await api<ApiDriver>(`/api/v1/drivers/${id}`, {
    method: 'PATCH',
    body: { status },
  })
  return fromApi(updated)
}

export async function deleteDriver(id: string): Promise<void> {
  await api<void>(`/api/v1/drivers/${id}`, { method: 'DELETE' })
}

export interface ApiCandidate {
  driver_id: string
  name: string
  status: DriverStatus
  coords: [number, number]
  distance_meters: number
  eta_seconds: number
  phone: string
  vehicle_type: VehicleType
  vehicle: string
  license_plate: string
  driver_photo: string
}

interface CandidatesResponse {
  city_id: CityId
  candidates: ApiCandidate[]
}

export function candidateToDriver(card: ApiCandidate, cityId: CityId): Driver {
  const distanceM = Math.round(card.distance_meters)
  return {
    id: card.driver_id,
    name: card.name,
    phone: card.phone,
    vehicleType: card.vehicle_type,
    vehicle: card.vehicle,
    licensePlate: card.license_plate,
    driverPhoto: card.driver_photo ?? '',
    vehiclePhoto: '',
    status: card.status,
    coords: card.coords,
    battery: 0,
    distanceM,
    etaMin: Math.max(1, Math.round(card.eta_seconds / 60)),
    zone: '',
    notes: '',
    cityId,
  }
}

export async function fetchCandidates(input: {
  pickup: [number, number]
  dropoff?: [number, number]
  cityId: CityId
  limit?: number
  radiusKm?: number
  serviceTypeId?: string
}): Promise<Driver[]> {
  const data = await api<CandidatesResponse>('/api/v1/dispatch/candidates', {
    method: 'POST',
    body: {
      pickup: { lng: input.pickup[0], lat: input.pickup[1] },
      dropoff: input.dropoff
        ? { lng: input.dropoff[0], lat: input.dropoff[1] }
        : undefined,
      city_id: input.cityId,
      limit: input.limit,
      radius_km: input.radiusKm,
      service_type_id: input.serviceTypeId,
    },
  })
  return data.candidates.map((card) => candidateToDriver(card, data.city_id))
}

export function rankCandidates(
  drivers: Driver[],
  origin: [number, number],
  limit = 5,
  maxDistanceM = Infinity,
): Driver[] {
  return rankByDistanceToOrigin(drivers, origin, limit, maxDistanceM, (driver) =>
    driver.status === 'available',
  )
}

/** Los N más cercanos al pickup, estén disponibles o en curso (no fuera de servicio). */
export function rankNearestToOrigin(
  drivers: Driver[],
  origin: [number, number],
  limit = 5,
): Driver[] {
  return rankByDistanceToOrigin(drivers, origin, limit, Infinity, (driver) =>
    driver.status !== 'offline',
  )
}

export function closestAssignable(
  drivers: Driver[],
  origin: [number, number],
  limit = 5,
): Driver[] {
  const available = rankCandidates(drivers, origin, limit, Infinity)
  if (available.length > 0) return available
  return rankNearestToOrigin(drivers, origin, limit)
}

function rankByDistanceToOrigin(
  drivers: Driver[],
  origin: [number, number],
  limit: number,
  maxDistanceM: number,
  include: (driver: Driver) => boolean,
): Driver[] {
  return drivers
    .filter(include)
    .map((driver) => {
      const distanceM = Math.round(haversineMeters(driver.coords, origin))
      return {
        ...driver,
        distanceM,
        etaMin: etaFromMeters(distanceM),
      }
    })
    .filter((driver) => driver.distanceM <= maxDistanceM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit)
}
