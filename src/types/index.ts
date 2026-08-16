export type DriverStatus = 'available' | 'busy' | 'offline'
export type DispatchStep = 1 | 2 | 3 | 4
export type InputTab = 'text' | 'screenshot'

export interface Driver {
  id: string
  name: string
  phone: string
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
}

export interface DriverDraft {
  name: string
  phone: string
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
  clientName: string
  clientPhone: string
  paymentMethod: string
  amount: string
}

export interface Session {
  token: string
  tenantId: string
  company: string
  operator: string
  operatorEmail: string
}
