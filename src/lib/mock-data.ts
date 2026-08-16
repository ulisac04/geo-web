import type { Driver, OrderDraft } from '../types'
import { etaFromMeters, haversineMeters } from './geo'

export const CITY_CENTER: [number, number] = [-66.8542, 10.496]

export const PLACES: Record<string, [number, number]> = {
  altamira: [-66.8531, 10.4984],
  'av. francisco de miranda': [-66.8531, 10.4984],
  'francisco de miranda': [-66.8531, 10.4984],
  chacao: [-66.8538, 10.4912],
  sambil: [-66.8546, 10.4888],
  'cc sambil': [-66.8546, 10.4888],
  'las mercedes': [-66.8554, 10.4802],
  'la castellana': [-66.8548, 10.5016],
  'plaza venezuela': [-66.8858, 10.4972],
  'el hatillo': [-66.8248, 10.4241],
  ccct: [-66.8559, 10.4881],
  'los palos grandes': [-66.8482, 10.5038],
  'el rosal': [-66.8586, 10.4968],
  'san bernardino': [-66.8774, 10.5112],
  'la california': [-66.8264, 10.4936],
  'el recleo': [-66.8516, 10.4924],
}

export const EMPTY_ORDER: OrderDraft = {
  origin: '',
  destination: '',
  originCoords: null,
  destCoords: null,
  clientName: '',
  clientPhone: '',
  paymentMethod: '',
  amount: '',
}

export const SAMPLE_WHATSAPP = `Hola, necesito un motorizado urgente
De: Av. Francisco de Miranda, Altamira
Hasta: CC Sambil, Chacao
Cliente: María González
Tel: 0412-555-0189
Pago: Efectivo $15`

const BASE_DRIVERS: Omit<Driver, 'distanceM' | 'etaMin'>[] = [
  {
    id: 'drv-01',
    name: 'Juan Pérez',
    phone: '584145550123',
    vehicle: 'Moto Empire 150',
    status: 'available',
    coords: [-66.8508, 10.4996],
    battery: 86,
  },
  {
    id: 'drv-02',
    name: 'Ana Rojas',
    phone: '584125550234',
    vehicle: 'Moto Bera Social 150',
    status: 'available',
    coords: [-66.8572, 10.4941],
    battery: 72,
  },
  {
    id: 'drv-03',
    name: 'Luis Herrera',
    phone: '584165550345',
    vehicle: 'Moto Yamaha FZ 2.0',
    status: 'available',
    coords: [-66.8479, 10.4928],
    battery: 94,
  },
  {
    id: 'drv-04',
    name: 'Carla Méndez',
    phone: '584245550456',
    vehicle: 'Moto Honda CB 125',
    status: 'available',
    coords: [-66.8614, 10.5012],
    battery: 61,
  },
  {
    id: 'drv-05',
    name: 'Pedro Silva',
    phone: '584145550567',
    vehicle: 'Moto Suzuki GN 125',
    status: 'available',
    coords: [-66.8446, 10.5054],
    battery: 48,
  },
  {
    id: 'drv-06',
    name: 'Sofía Rivas',
    phone: '584125550678',
    vehicle: 'Moto Keeway Superlight',
    status: 'available',
    coords: [-66.8691, 10.4896],
    battery: 91,
  },
  {
    id: 'drv-07',
    name: 'Miguel Torres',
    phone: '584165550789',
    vehicle: 'Moto Empire Arsen 2',
    status: 'available',
    coords: [-66.8398, 10.4872],
    battery: 77,
  },
  {
    id: 'drv-08',
    name: 'Elena Castro',
    phone: '584245550890',
    vehicle: 'Moto TVS Apache 160',
    status: 'available',
    coords: [-66.8588, 10.5088],
    battery: 55,
  },
  {
    id: 'drv-09',
    name: 'Diego Navarro',
    phone: '584145550901',
    vehicle: 'Moto Bajaj Pulsar 150',
    status: 'busy',
    coords: [-66.8724, 10.4964],
    battery: 33,
  },
  {
    id: 'drv-10',
    name: 'Valeria Díaz',
    phone: '584125550012',
    vehicle: 'Moto Honda Wave 110',
    status: 'busy',
    coords: [-66.8412, 10.4988],
    battery: 41,
  },
]

export function getFleet(): Driver[] {
  return BASE_DRIVERS.map((driver) => ({
    ...driver,
    distanceM: 0,
    etaMin: 0,
  }))
}

export function rankCandidates(
  drivers: Driver[],
  origin: [number, number],
  limit = 5,
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
  clientName: 'Ricardo Blanco',
  clientPhone: '0414-622-7741',
  paymentMethod: 'Pago móvil',
  amount: '$22',
}
