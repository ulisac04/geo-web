import type { ServiceRecord, ServiceType, ServiceTypeDraft } from '../types'
import { PLACES } from './mock-data'

const TYPES_KEY = 'geo_service_types_v1'
const RECORDS_KEY = 'geo_service_records_v1'

export const DEFAULT_SERVICE_TYPE_ID = 'svc-traslado'

export const EMPTY_TYPE_DRAFT: ServiceTypeDraft = {
  name: '',
  description: '',
  active: true,
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

export const SEED_SERVICE_RECORDS: ServiceRecord[] = [
  {
    id: 'rec-01',
    typeId: 'svc-traslado',
    typeName: 'Traslado',
    origin: 'Av. Francisco de Miranda, Altamira',
    destination: 'CC Sambil, Chacao',
    originCoords: PLACES.altamira,
    destCoords: PLACES.sambil,
    clientName: 'María González',
    clientPhone: '0412-555-0189',
    driverId: 'drv-01',
    driverName: 'Juan Pérez',
    paymentMethod: 'Efectivo',
    amount: '$15.00',
    distanceM: 980,
    createdAt: '2026-08-15T14:22:00.000Z',
    status: 'assigned',
    cityId: 'caracas',
  },
  {
    id: 'rec-02',
    typeId: 'svc-delivery',
    typeName: 'Delivery',
    origin: 'Las Mercedes, Calle París',
    destination: 'Los Palos Grandes, Av. Andrés Bello',
    originCoords: PLACES['las mercedes'],
    destCoords: PLACES['los palos grandes'],
    clientName: 'Ricardo Blanco',
    clientPhone: '0414-622-7741',
    driverId: 'drv-02',
    driverName: 'Ana Rojas',
    paymentMethod: 'Pago móvil',
    amount: '$22.00',
    distanceM: 3100,
    createdAt: '2026-08-14T18:05:00.000Z',
    status: 'completed',
    cityId: 'caracas',
  },
  {
    id: 'rec-03',
    typeId: 'svc-express',
    typeName: 'Express',
    origin: 'Chacao',
    destination: 'El Hatillo',
    originCoords: PLACES.chacao,
    destCoords: PLACES['el hatillo'],
    clientName: 'Carmen Díaz',
    clientPhone: '0416-300-1122',
    driverId: 'drv-03',
    driverName: 'Luis Herrera',
    paymentMethod: 'Efectivo',
    amount: '$28.50',
    distanceM: 8900,
    createdAt: '2026-08-13T22:40:00.000Z',
    status: 'cancelled',
    cityId: 'caracas',
  },
  {
    id: 'rec-04',
    typeId: 'svc-traslado',
    typeName: 'Traslado',
    origin: 'Plaza Venezuela',
    destination: 'CCCT',
    originCoords: PLACES['plaza venezuela'],
    destCoords: PLACES.ccct,
    clientName: 'Andrés Molina',
    clientPhone: '0424-888-0091',
    driverId: 'drv-04',
    driverName: 'Carla Méndez',
    paymentMethod: 'Pago móvil',
    amount: '$18.00',
    distanceM: 4200,
    createdAt: '2026-08-12T09:15:00.000Z',
    status: 'completed',
    cityId: 'caracas',
  },
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
