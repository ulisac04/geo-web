import type { VehicleType } from '../types'

export const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: 'car', label: 'Carro' },
  { value: 'motorcycle', label: 'Moto' },
]

export const ALL_VEHICLE_TYPES: VehicleType[] = VEHICLE_TYPE_OPTIONS.map((item) => item.value)

export function vehicleTypeLabel(type: VehicleType): string {
  return VEHICLE_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type
}

export function formatVehicleLine(vehicleType: VehicleType, vehicle: string): string {
  const label = vehicleTypeLabel(vehicleType)
  return vehicle ? `${label} · ${vehicle}` : label
}
