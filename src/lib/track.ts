import { api, apiBaseUrl } from './api'
import type { VehicleType } from '../types'
import type { PublicBranding } from './branding'

export interface PublicTrack {
  status: string
  driverName: string
  vehicle: string
  licensePlate: string
  vehicleType: VehicleType | null
  origin: string
  originCoords: [number, number] | null
  driverCoords: [number, number] | null
  driverUpdatedAt: string | null
  branding: PublicBranding
  refreshSeconds: number
  /** Recorrido GPS `[lng, lat]` del servicio finalizado. */
  route: [number, number][]
  routeDistanceM: number | null
  destCoords: [number, number] | null
  driverPhotoUrl: string | null
  vehiclePhotoUrl: string | null
}

interface ApiPublicTrack {
  status: string
  driver_name: string
  vehicle: string
  license_plate: string
  vehicle_type: string | null
  origin: string
  origin_lng: number | null
  origin_lat: number | null
  driver_lng: number | null
  driver_lat: number | null
  driver_updated_at?: string | null
  branding: PublicBranding
  refresh_seconds: number
  route?: [number, number][]
  route_distance_m?: number | null
  dest_lng?: number | null
  dest_lat?: number | null
  has_driver_photo?: boolean
  has_vehicle_photo?: boolean
}

export function publicTrackPhotoUrl(token: string, kind: 'driver' | 'vehicle'): string {
  return `${apiBaseUrl()}/api/v1/public/track/${encodeURIComponent(token)}/photo/${kind}`
}

function parseRoute(raw: unknown): [number, number][] {
  if (!Array.isArray(raw)) return []
  const out: [number, number][] = []
  for (const point of raw) {
    if (!Array.isArray(point)) continue
    const parsed = coords(point[0], point[1])
    if (parsed) out.push(parsed)
  }
  return out
}

function coords(
  lng: number | null | undefined,
  lat: number | null | undefined,
): [number, number] | null {
  if (lng == null || lat == null) return null
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return [lng, lat]
}

function parseVehicleType(value: string | null | undefined): VehicleType | null {
  return value === 'car' || value === 'motorcycle' ? value : null
}

export async function fetchPublicTrack(
  token: string,
  signal?: AbortSignal,
): Promise<PublicTrack> {
  const data = await api<ApiPublicTrack>(`/api/v1/public/track/${token}`, {
    auth: false,
    signal,
  })
  return {
    status: data.status,
    driverName: data.driver_name,
    vehicle: data.vehicle,
    licensePlate: data.license_plate,
    vehicleType: parseVehicleType(data.vehicle_type),
    origin: data.origin,
    originCoords: coords(data.origin_lng, data.origin_lat),
    driverCoords: coords(data.driver_lng, data.driver_lat),
    driverUpdatedAt: data.driver_updated_at ?? null,
    branding: data.branding,
    refreshSeconds: data.refresh_seconds || 15,
    route: parseRoute(data.route),
    routeDistanceM: data.route_distance_m ?? null,
    destCoords: coords(data.dest_lng, data.dest_lat),
    driverPhotoUrl: data.has_driver_photo ? publicTrackPhotoUrl(token, 'driver') : null,
    vehiclePhotoUrl: data.has_vehicle_photo ? publicTrackPhotoUrl(token, 'vehicle') : null,
  }
}
