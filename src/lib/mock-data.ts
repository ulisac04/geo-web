import type { Driver, OrderDraft } from '../types'
import { etaFromMeters, haversineMeters } from './geo'
import { getCity } from './cities'

export const CITY_CENTER: [number, number] = getCity('caracas').center

export const PLACES: Record<string, [number, number]> = getCity('caracas').places

export const EMPTY_ORDER: OrderDraft = {
  origin: '',
  destination: '',
  originCoords: null,
  destCoords: null,
  originHint: '',
  destHint: '',
  clientName: '',
  clientPhone: '',
  paymentMethod: '',
  amount: '',
  notes: '',
  serviceTypeId: 'svc-traslado',
}

export const SAMPLE_WHATSAPP = `Hola, necesito un motorizado urgente
De: Av. Francisco de Miranda, Altamira
Hasta: CC Sambil, Chacao
Cliente: María González
Tel: 0412-555-0189
Pago: Efectivo $15`

const BASE_DRIVERS: Omit<Driver, 'distanceM' | 'etaMin' | 'cityId'>[] = [
  {
    id: 'drv-01',
    name: 'Juan Pérez',
    phone: '584145550123',
    vehicle: 'Moto Empire 150',
    licensePlate: 'AB123CD',
    driverPhoto: '',
    vehiclePhoto: '',
    status: 'available',
    coords: [-66.8508, 10.4996],
    battery: 86,
    zone: 'Altamira',
    notes: 'Turno mañana · cubre Chacao',
  },
  {
    id: 'drv-02',
    name: 'Ana Rojas',
    phone: '584125550234',
    vehicle: 'Moto Bera Social 150',
    licensePlate: 'XY456EF',
    driverPhoto: '',
    vehiclePhoto: '',
    status: 'available',
    coords: [-66.8572, 10.4941],
    battery: 72,
    zone: 'Chacao',
    notes: '',
  },
  {
    id: 'drv-03',
    name: 'Luis Herrera',
    phone: '584165550345',
    vehicle: 'Moto Yamaha FZ 2.0',
    licensePlate: 'GH789JK',
    driverPhoto: '',
    vehiclePhoto: '',
    status: 'available',
    coords: [-66.8479, 10.4928],
    battery: 94,
    zone: 'Chacao',
    notes: 'Prefiere pedidos de centro comercial',
  },
  {
    id: 'drv-04',
    name: 'Carla Méndez',
    phone: '584245550456',
    vehicle: 'Moto Honda CB 125',
    licensePlate: 'LM234NP',
    driverPhoto: '',
    vehiclePhoto: '',
    status: 'available',
    coords: [-66.8614, 10.5012],
    battery: 61,
    zone: 'La Castellana',
    notes: '',
  },
  {
    id: 'drv-05',
    name: 'Pedro Silva',
    phone: '584145550567',
    vehicle: 'Moto Suzuki GN 125',
    licensePlate: 'QR567ST',
    driverPhoto: '',
    vehiclePhoto: '',
    status: 'available',
    coords: [-66.8446, 10.5054],
    battery: 48,
    zone: 'Los Palos Grandes',
    notes: '',
  },
  {
    id: 'drv-06',
    name: 'Sofía Rivas',
    phone: '584125550678',
    vehicle: 'Moto Keeway Superlight',
    licensePlate: 'UV890WX',
    driverPhoto: '',
    vehiclePhoto: '',
    status: 'available',
    coords: [-66.8691, 10.4896],
    battery: 91,
    zone: 'El Rosal',
    notes: '',
  },
  {
    id: 'drv-07',
    name: 'Miguel Torres',
    phone: '584165550789',
    vehicle: 'Moto Empire Arsen 2',
    licensePlate: 'YZ345AB',
    driverPhoto: '',
    vehiclePhoto: '',
    status: 'available',
    coords: [-66.8398, 10.4872],
    battery: 77,
    zone: 'Las Mercedes',
    notes: '',
  },
  {
    id: 'drv-08',
    name: 'Elena Castro',
    phone: '584245550890',
    vehicle: 'Moto TVS Apache 160',
    licensePlate: 'CD678EF',
    driverPhoto: '',
    vehiclePhoto: '',
    status: 'available',
    coords: [-66.8588, 10.5088],
    battery: 55,
    zone: 'La Castellana',
    notes: '',
  },
  {
    id: 'drv-09',
    name: 'Diego Navarro',
    phone: '584145550901',
    vehicle: 'Moto Bajaj Pulsar 150',
    licensePlate: 'GH901JK',
    driverPhoto: '',
    vehiclePhoto: '',
    status: 'busy',
    coords: [-66.8724, 10.4964],
    battery: 33,
    zone: 'Plaza Venezuela',
    notes: 'En servicio hasta las 18:00',
  },
  {
    id: 'drv-10',
    name: 'Valeria Díaz',
    phone: '584125550012',
    vehicle: 'Moto Honda Wave 110',
    licensePlate: 'LM012NP',
    driverPhoto: '',
    vehiclePhoto: '',
    status: 'busy',
    coords: [-66.8412, 10.4988],
    battery: 41,
    zone: 'Altamira',
    notes: '',
  },
]

export function getFleet(): Driver[] {
  return BASE_DRIVERS.map((driver) => ({
    ...driver,
    cityId: 'caracas',
    distanceM: 0,
    etaMin: 0,
  }))
}

export const NEARBY_RADIUS_M = 1500

export function rankCandidates(
  drivers: Driver[],
  origin: [number, number],
  limit = 5,
  maxDistanceM = Infinity,
): Driver[] {
  return drivers
    .filter((driver) => driver.status === 'available')
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

export function resolvePlace(query: string): [number, number] | null {
  const normalized = query.toLowerCase().trim()
  if (PLACES[normalized]) return PLACES[normalized]

  const match = Object.entries(PLACES).find(([key]) => normalized.includes(key))
  return match ? match[1] : null
}

export const SCREENSHOT_ORDER: OrderDraft = {
  origin: 'Las Mercedes, Calle París',
  destination: 'Los Palos Grandes, Av. Andrés Bello',
  originCoords: PLACES['las mercedes'],
  destCoords: PLACES['los palos grandes'],
  originHint: 'Las Mercedes',
  destHint: 'Los Palos Grandes',
  clientName: 'Ricardo Blanco',
  clientPhone: '0414-622-7741',
  paymentMethod: 'Pago móvil',
  amount: '$22',
  notes: '',
  serviceTypeId: 'svc-delivery',
}
