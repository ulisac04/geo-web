import type { CityId } from '../types'

export type { CityId }

export interface City {
  id: CityId
  name: string
  country: string
  code: string
  center: [number, number]
  geocodeSuffix: string
  places: Record<string, [number, number]>
  zones: string[]
}

export const DEFAULT_CITY_ID: CityId = 'caracas'

const CARACAS_PLACES: Record<string, [number, number]> = {
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

export const CITIES: City[] = [
  {
    id: 'caracas',
    name: 'Caracas',
    country: 'Venezuela',
    code: 'CCS',
    center: [-66.8542, 10.496],
    geocodeSuffix: 'Caracas, Venezuela',
    places: CARACAS_PLACES,
    zones: [
      'Altamira',
      'Chacao',
      'La Castellana',
      'Las Mercedes',
      'Los Palos Grandes',
      'El Rosal',
      'Plaza Venezuela',
      'El Hatillo',
      'La California',
      'San Bernardino',
    ],
  },
  {
    id: 'san_cristobal',
    name: 'San Cristóbal',
    country: 'Venezuela',
    code: 'SCI',
    center: [-72.215, 7.775],
    geocodeSuffix: 'San Cristóbal, Táchira, Venezuela',
    places: {
      centro: [-72.225, 7.767],
      'la concordia': [-72.21, 7.78],
      'pueblo nuevo': [-72.2, 7.77],
      baratillo: [-72.23, 7.76],
      'la erminia': [-72.205, 7.785],
    },
    zones: ['Centro', 'La Concordia', 'Pueblo Nuevo', 'Baratillo', 'La Erminia'],
  },
  {
    id: 'cucuta',
    name: 'Cúcuta',
    country: 'Colombia',
    code: 'CUC',
    center: [-72.5, 7.9],
    geocodeSuffix: 'Cúcuta, Norte de Santander, Colombia',
    places: {
      centro: [-72.507, 7.894],
      caobos: [-72.49, 7.91],
      prados: [-72.48, 7.885],
      aeropuerto: [-72.511, 7.927],
      'san luis': [-72.52, 7.88],
    },
    zones: ['Centro', 'Caobos', 'Prados', 'Aeropuerto', 'San Luis'],
  },
  {
    id: 'bogota',
    name: 'Bogotá',
    country: 'Colombia',
    code: 'BOG',
    center: [-74.072, 4.653],
    geocodeSuffix: 'Bogotá, Colombia',
    places: {
      chapinero: [-74.063, 4.648],
      usaquen: [-74.031, 4.695],
      centro: [-74.075, 4.598],
      'zona t': [-74.054, 4.667],
      'parque 93': [-74.049, 4.676],
    },
    zones: ['Chapinero', 'Usaquén', 'Centro', 'Zona T', 'Parque 93'],
  },
]

const CITY_IDS: CityId[] = CITIES.map((city) => city.id)

export function isCityId(value: unknown): value is CityId {
  return typeof value === 'string' && CITY_IDS.includes(value as CityId)
}

export function getCity(id: string | undefined | null): City {
  return CITIES.find((city) => city.id === id) ?? CITIES[0]
}

export function resolveCityPlace(city: City, query: string): [number, number] | null {
  const normalized = query.toLowerCase().trim()
  if (city.places[normalized]) return city.places[normalized]
  const match = Object.entries(city.places).find(([key]) => normalized.includes(key))
  return match ? match[1] : null
}
