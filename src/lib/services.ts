import { ALL_VEHICLE_TYPES } from './vehicles'
import type {
  CityId,
  ServiceRecord,
  ServiceStatus,
  ServiceType,
  ServiceTypeDraft,
  VehicleType,
} from '../types'
import { api } from './api'
import { formatFare } from './costs'

export const EMPTY_TYPE_DRAFT: ServiceTypeDraft = {
  name: '',
  description: '',
  active: true,
  allowedVehicleTypes: [...ALL_VEHICLE_TYPES],
}

export const LIVE_SERVICE_STATUSES: ServiceStatus[] = ['assigned', 'en_route', 'in_progress']

export function isLiveServiceStatus(status: ServiceStatus): boolean {
  return LIVE_SERVICE_STATUSES.includes(status)
}

export function isPickupLeg(status: ServiceStatus): boolean {
  return status === 'assigned' || status === 'en_route'
}

interface ApiServiceType {
  id: string
  name: string
  description: string
  active: boolean
  allowed_vehicle_types: VehicleType[]
}

interface TypesResponse {
  items: ApiServiceType[]
}

interface ApiServiceRecord {
  id: string
  service_type_id: string
  type_name: string
  origin: string
  destination: string
  origin_lng: number | null
  origin_lat: number | null
  dest_lng: number | null
  dest_lat: number | null
  client_name: string
  client_phone: string
  driver_id: string | null
  driver_name: string
  payment_method: string
  amount: number
  distance_m: number
  notes: string
  city_id: CityId
  status: ServiceStatus
  created_at: string
}

interface RecordsResponse {
  items: ApiServiceRecord[]
  total: number
}

function coordsFrom(lng: number | null, lat: number | null): [number, number] | null {
  if (lng == null || lat == null) return null
  return [lng, lat]
}

function fromType(item: ApiServiceType): ServiceType {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    active: item.active,
    allowedVehicleTypes: item.allowed_vehicle_types ?? [...ALL_VEHICLE_TYPES],
  }
}

function fromRecord(item: ApiServiceRecord): ServiceRecord {
  return {
    id: item.id,
    typeId: item.service_type_id,
    typeName: item.type_name,
    origin: item.origin,
    destination: item.destination,
    originCoords: coordsFrom(item.origin_lng, item.origin_lat),
    destCoords: coordsFrom(item.dest_lng, item.dest_lat),
    clientName: item.client_name,
    clientPhone: item.client_phone,
    driverId: item.driver_id ?? '',
    driverName: item.driver_name ?? '',
    paymentMethod: item.payment_method,
    amount: formatFare(item.amount),
    distanceM: item.distance_m,
    createdAt: item.created_at,
    status: item.status,
    cityId: item.city_id,
  }
}

export async function fetchServiceTypes(active?: boolean): Promise<ServiceType[]> {
  const data = await api<TypesResponse>('/api/v1/service-types', {
    query: { active },
  })
  return data.items.map(fromType)
}

export async function createServiceType(draft: ServiceTypeDraft): Promise<ServiceType> {
  const created = await api<ApiServiceType>('/api/v1/service-types', {
    method: 'POST',
    body: {
      name: draft.name.trim(),
      description: draft.description.trim(),
      active: draft.active,
      allowed_vehicle_types: draft.allowedVehicleTypes,
    },
  })
  return fromType(created)
}

export async function updateServiceType(id: string, draft: ServiceTypeDraft): Promise<ServiceType> {
  const updated = await api<ApiServiceType>(`/api/v1/service-types/${id}`, {
    method: 'PATCH',
    body: {
      name: draft.name.trim(),
      description: draft.description.trim(),
      active: draft.active,
      allowed_vehicle_types: draft.allowedVehicleTypes,
    },
  })
  return fromType(updated)
}

export async function deleteServiceType(id: string): Promise<void> {
  await api<void>(`/api/v1/service-types/${id}`, { method: 'DELETE' })
}

export async function fetchServiceRecords(query?: {
  status?: ServiceStatus
  q?: string
  cityId?: CityId
}): Promise<ServiceRecord[]> {
  const data = await api<RecordsResponse>('/api/v1/services', {
    query: { status: query?.status, q: query?.q, city_id: query?.cityId },
  })
  return data.items.map(fromRecord)
}

export interface CreateServiceInput {
  serviceTypeId: string
  origin: string
  destination: string
  originCoords: [number, number] | null
  destCoords: [number, number] | null
  clientName: string
  clientPhone: string
  paymentMethod: string
  amount: string
  distanceM: number
  notes: string
  cityId: CityId
}

export async function createService(input: CreateServiceInput): Promise<ServiceRecord> {
  const created = await api<ApiServiceRecord>('/api/v1/services', {
    method: 'POST',
    body: {
      service_type_id: input.serviceTypeId,
      origin: input.origin,
      destination: input.destination,
      origin_lng: input.originCoords?.[0],
      origin_lat: input.originCoords?.[1],
      dest_lng: input.destCoords?.[0],
      dest_lat: input.destCoords?.[1],
      client_name: input.clientName,
      client_phone: input.clientPhone,
      payment_method: input.paymentMethod,
      amount: input.amount.trim() || '0',
      distance_m: input.distanceM,
      notes: input.notes,
      city_id: input.cityId,
    },
  })
  return fromRecord(created)
}

export async function patchService(
  id: string,
  patch: { driverId?: string; status?: ServiceStatus },
): Promise<ServiceRecord> {
  const updated = await api<ApiServiceRecord>(`/api/v1/services/${id}`, {
    method: 'PATCH',
    body: {
      driver_id: patch.driverId,
      status: patch.status,
    },
  })
  return fromRecord(updated)
}

export type TrackSource = 'gps' | 'none'

export interface ServiceTrackPoint {
  lng: number
  lat: number
  recordedAt: string
}

export interface ServiceTrack {
  serviceId: string
  source: TrackSource
  points: ServiceTrackPoint[]
}

interface ApiTrackPoint {
  lng: number
  lat: number
  recorded_at: string
}

interface ApiServiceTrack {
  service_id: string
  source: TrackSource
  points: ApiTrackPoint[]
}

export async function fetchServiceTrack(id: string): Promise<ServiceTrack> {
  const data = await api<ApiServiceTrack>(`/api/v1/services/${id}/track`)
  return {
    serviceId: data.service_id,
    source: data.source,
    points: data.points.map((point) => ({
      lng: point.lng,
      lat: point.lat,
      recordedAt: point.recorded_at,
    })),
  }
}
