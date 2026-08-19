import type { ServiceRecord, ServiceStatus, ServiceType, ServiceTypeDraft } from '../types'
import { getCity } from './cities'
import { haversineMeters } from './geo'

const TYPES_KEY = 'geo_service_types_v1'
const RECORDS_KEY = 'geo_service_records_v2'

export const DEFAULT_SERVICE_TYPE_ID = 'svc-traslado'

export const EMPTY_TYPE_DRAFT: ServiceTypeDraft = {
  name: '',
  description: '',
  active: true,
}

export const LIVE_SERVICE_STATUSES: ServiceStatus[] = ['assigned', 'en_route', 'in_progress']

export function isLiveServiceStatus(status: ServiceStatus): boolean {
  return LIVE_SERVICE_STATUSES.includes(status)
}

export function isPickupLeg(status: ServiceStatus): boolean {
  return status === 'assigned' || status === 'en_route'
}

export const SEED_SERVICE_TYPES: ServiceType[] = [
  {
    id: 'svc-traslado',
    name: 'Traslado',
    description: 'Servicio de transporte de un punto a otro',
    active: true,
  },
  {
    id: 'svc-delivery',
    name: 'Delivery',
    description: 'Entrega de paquetes o documentos',
    active: true,
  },
  {
    id: 'svc-express',
    name: 'Express',
    description: 'Servicio urgente con prioridad',
    active: true,
  },
]

const CCS = getCity('caracas').places
const SCI = getCity('san_cristobal').places
const CUC = getCity('cucuta').places
const BOG = getCity('bogota').places

function seedRecord(
  record: Omit<ServiceRecord, 'distanceM'> & { distanceM?: number },
): ServiceRecord {
  const originCoords = record.originCoords
  const destCoords = record.destCoords
  const distanceM =
    record.distanceM ??
    (originCoords && destCoords ? Math.round(haversineMeters(originCoords, destCoords)) : 0)
  return { ...record, distanceM }
}

export const SEED_SERVICE_RECORDS: ServiceRecord[] = [
  seedRecord({
    id: 'rec-01',
    typeId: 'svc-traslado',
    typeName: 'Traslado',
    origin: 'Av. Francisco de Miranda, Altamira',
    destination: 'CC Sambil, Chacao',
    originCoords: CCS.altamira,
    destCoords: CCS.sambil,
    clientName: 'María González',
    clientPhone: '0412-555-0189',
    driverId: 'drv-01',
    driverName: 'Juan Pérez',
    paymentMethod: 'Efectivo',
    amount: '$15.00',
    createdAt: '2026-08-15T14:22:00.000Z',
    status: 'completed',
    cityId: 'caracas',
  }),
  seedRecord({
    id: 'rec-02',
    typeId: 'svc-delivery',
    typeName: 'Delivery',
    origin: 'Las Mercedes, Calle París',
    destination: 'Los Palos Grandes, Av. Andrés Bello',
    originCoords: CCS['las mercedes'],
    destCoords: CCS['los palos grandes'],
    clientName: 'Ricardo Blanco',
    clientPhone: '0414-622-7741',
    driverId: 'drv-02',
    driverName: 'Ana Rojas',
    paymentMethod: 'Pago móvil',
    amount: '$22.00',
    createdAt: '2026-08-14T18:05:00.000Z',
    status: 'completed',
    cityId: 'caracas',
  }),
  seedRecord({
    id: 'rec-03',
    typeId: 'svc-express',
    typeName: 'Express',
    origin: 'Chacao',
    destination: 'El Hatillo',
    originCoords: CCS.chacao,
    destCoords: CCS['el hatillo'],
    clientName: 'Carmen Díaz',
    clientPhone: '0416-300-1122',
    driverId: 'drv-03',
    driverName: 'Luis Herrera',
    paymentMethod: 'Efectivo',
    amount: '$28.50',
    createdAt: '2026-08-13T22:40:00.000Z',
    status: 'cancelled',
    cityId: 'caracas',
  }),
  seedRecord({
    id: 'rec-04',
    typeId: 'svc-traslado',
    typeName: 'Traslado',
    origin: 'Plaza Venezuela',
    destination: 'CCCT',
    originCoords: CCS['plaza venezuela'],
    destCoords: CCS.ccct,
    clientName: 'Andrés Molina',
    clientPhone: '0424-888-0091',
    driverId: 'drv-04',
    driverName: 'Carla Méndez',
    paymentMethod: 'Pago móvil',
    amount: '$18.00',
    createdAt: '2026-08-12T09:15:00.000Z',
    status: 'completed',
    cityId: 'caracas',
  }),
  seedRecord({
    id: 'rec-05',
    typeId: 'svc-traslado',
    typeName: 'Traslado',
    origin: 'Plaza Venezuela',
    destination: 'Altamira',
    originCoords: CCS['plaza venezuela'],
    destCoords: CCS.altamira,
    clientName: 'Sofía Campos',
    clientPhone: '0412-700-4411',
    driverId: 'drv-09',
    driverName: 'Diego Navarro',
    paymentMethod: 'Efectivo',
    amount: '$12.00',
    createdAt: '2026-08-19T11:40:00.000Z',
    status: 'en_route',
    cityId: 'caracas',
  }),
  seedRecord({
    id: 'rec-06',
    typeId: 'svc-delivery',
    typeName: 'Delivery',
    origin: 'Altamira',
    destination: 'Las Mercedes',
    originCoords: CCS.altamira,
    destCoords: CCS['las mercedes'],
    clientName: 'Héctor Rivas',
    clientPhone: '0414-221-9088',
    driverId: 'drv-10',
    driverName: 'Valeria Díaz',
    paymentMethod: 'Pago móvil',
    amount: '$16.50',
    createdAt: '2026-08-19T11:10:00.000Z',
    status: 'in_progress',
    cityId: 'caracas',
  }),
  seedRecord({
    id: 'rec-07',
    typeId: 'svc-traslado',
    typeName: 'Traslado',
    origin: 'La Erminia',
    destination: 'Centro',
    originCoords: SCI['la erminia'],
    destCoords: SCI.centro,
    clientName: 'Paola Méndez',
    clientPhone: '0414-555-2201',
    driverId: 'drv-sci-05',
    driverName: 'José Zambrano',
    paymentMethod: 'Efectivo',
    amount: '$8.00',
    createdAt: '2026-08-19T12:05:00.000Z',
    status: 'en_route',
    cityId: 'san_cristobal',
  }),
  seedRecord({
    id: 'rec-08',
    typeId: 'svc-express',
    typeName: 'Express',
    origin: 'Aeropuerto Camilo Daza',
    destination: 'Centro',
    originCoords: CUC.aeropuerto,
    destCoords: CUC.centro,
    clientName: 'Iván Paredes',
    clientPhone: '57315-440-1188',
    driverId: 'drv-cuc-04',
    driverName: 'Natalia Niño',
    paymentMethod: 'Pago móvil',
    amount: '$14.00',
    createdAt: '2026-08-19T12:20:00.000Z',
    status: 'in_progress',
    cityId: 'cucuta',
  }),
  seedRecord({
    id: 'rec-09',
    typeId: 'svc-traslado',
    typeName: 'Traslado',
    origin: 'Parque 93',
    destination: 'Chapinero',
    originCoords: BOG['parque 93'],
    destCoords: BOG.chapinero,
    clientName: 'Laura Ortiz',
    clientPhone: '57310-882-4410',
    driverId: 'drv-bog-05',
    driverName: 'Julián Mejía',
    paymentMethod: 'Efectivo',
    amount: '$18.00',
    createdAt: '2026-08-19T12:30:00.000Z',
    status: 'en_route',
    cityId: 'bogota',
  }),
]

function readList<T>(key: string, fallback: T[]): T[] {
  const raw = localStorage.getItem(key)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as T[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      localStorage.removeItem(key)
    }
  }

  localStorage.setItem(key, JSON.stringify(fallback))
  return fallback
}

export function loadServiceTypes(): ServiceType[] {
  return readList(TYPES_KEY, SEED_SERVICE_TYPES)
}

export function persistServiceTypes(types: ServiceType[]): void {
  localStorage.setItem(TYPES_KEY, JSON.stringify(types))
}

export function loadServiceRecords(): ServiceRecord[] {
  return readList(RECORDS_KEY, SEED_SERVICE_RECORDS).map((record) => ({
    ...record,
    cityId: record.cityId ?? 'caracas',
  }))
}

export function persistServiceRecords(records: ServiceRecord[]): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}

export function createServiceType(draft: ServiceTypeDraft, existing?: ServiceType): ServiceType {
  return {
    id: existing?.id ?? `svc-${Date.now()}`,
    name: draft.name.trim(),
    description: draft.description.trim(),
    active: draft.active,
  }
}

export function createServiceRecord(
  draft: Omit<ServiceRecord, 'id' | 'createdAt'>,
): ServiceRecord {
  return {
    ...draft,
    id: `rec-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
}
