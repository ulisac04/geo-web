export type CityId = 'caracas' | 'san_cristobal' | 'cucuta' | 'bogota'
export type DriverStatus = 'available' | 'busy' | 'offline'
export type DispatchStep = 1 | 2 | 3 | 4
export type InputTab = 'text' | 'screenshot' | 'audio'
export type ServiceStatus =
  | 'pending'
  | 'assigned'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
export type MapMode = 'fleet' | 'live'
export type PinFocus = 'origin' | 'dest'
export type CostRuleType = 'distance' | 'night'
export type SurchargeType = 'fixed' | 'percent'
export type MapRefreshSeconds = 5 | 10 | 15 | 30 | 60
export type VehicleType = 'car' | 'motorcycle'

export interface Driver {
  id: string
  name: string
  phone: string
  vehicleType: VehicleType
  vehicle: string
  licensePlate: string
  driverPhoto: string
  vehiclePhoto: string
  status: DriverStatus
  coords: [number, number]
  battery: number
  distanceM: number
  etaMin: number
  zone: string
  notes: string
  cityId: CityId
}

export interface DriverDraft {
  name: string
  phone: string
  vehicleType: VehicleType
  vehicle: string
  licensePlate: string
  driverPhoto: string
  vehiclePhoto: string
  status: DriverStatus
  zone: string
  notes: string
}

export interface OrderDraft {
  origin: string
  destination: string
  originCoords: [number, number] | null
  destCoords: [number, number] | null
  originHint: string
  destHint: string
  clientName: string
  clientPhone: string
  paymentMethod: string
  amount: string
  notes: string
  serviceTypeId: string
}

export interface AppSettings {
  mapRefreshSeconds: MapRefreshSeconds
  cityId: CityId
}

export interface ServiceType {
  id: string
  name: string
  description: string
  active: boolean
  allowedVehicleTypes: VehicleType[]
}

export interface ServiceTypeDraft {
  name: string
  description: string
  active: boolean
  allowedVehicleTypes: VehicleType[]
}

export interface ServiceRecord {
  id: string
  typeId: string
  typeName: string
  origin: string
  destination: string
  originCoords: [number, number] | null
  destCoords: [number, number] | null
  clientName: string
  clientPhone: string
  driverId: string
  driverName: string
  paymentMethod: string
  amount: string
  distanceM: number
  createdAt: string
  status: ServiceStatus
  cityId: CityId
}

export interface CostRule {
  id: string
  name: string
  enabled: boolean
  type: CostRuleType
  pricePerKm?: number
  startHour?: number
  endHour?: number
  surchargeType?: SurchargeType
  surchargeValue?: number
}

export interface CostRuleDraft {
  name: string
  enabled: boolean
  type: CostRuleType
  pricePerKm: number
  startHour: number
  endHour: number
  surchargeType: SurchargeType
  surchargeValue: number
}

export interface FareEstimate {
  distanceM: number
  distanceKm: number
  distanceSubtotal: number
  nightSurcharge: number
  total: number
  appliedNightRules: string[]
}

export interface Session {
  token: string
  tenantId: string
  company: string
  operator: string
  operatorEmail: string
}

export interface LiveTrip {
  record: ServiceRecord
  driver: Driver
}
