import { CITY_CENTER } from './mock-data'

export interface PlaceHit {
  id: string
  label: string
  coords: [number, number]
}

interface PhotonFeature {
  geometry?: { coordinates?: number[] }
  properties?: {
    osm_id?: number
    osm_type?: string
    name?: string
    street?: string
    housenumber?: string
    district?: string
    city?: string
    state?: string
    country?: string
  }
}

interface PhotonResponse {
  features?: PhotonFeature[]
}

const PHOTON_URL = 'https://photon.komoot.io/api/'
const CARACAS_BBOX = '-67.12,10.36,-66.72,10.57'

function featureLabel(feature: PhotonFeature): string {
  const props = feature.properties ?? {}
  const street = [props.housenumber, props.street].filter(Boolean).join(' ')
  const parts = [props.name, street, props.district, props.city, props.state].filter(
    (part, index, all) => Boolean(part) && all.indexOf(part) === index,
  )
  return parts.join(', ') || 'Punto en el mapa'
}

function featureId(feature: PhotonFeature, index: number): string {
  const props = feature.properties ?? {}
  if (props.osm_type && props.osm_id) return `${props.osm_type}-${props.osm_id}`
  return `hit-${index}`
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceHit[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const url = new URL(PHOTON_URL)
  url.searchParams.set('q', q)
  url.searchParams.set('lat', String(CITY_CENTER[1]))
  url.searchParams.set('lon', String(CITY_CENTER[0]))
  url.searchParams.set('limit', '6')
  url.searchParams.set('lang', 'es')
  url.searchParams.set('bbox', CARACAS_BBOX)

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error('No se pudo buscar el punto')
  }

  const data = (await response.json()) as PhotonResponse
  return (data.features ?? []).flatMap((feature, index) => {
    const coords = feature.geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) return []
    const lng = Number(coords[0])
    const lat = Number(coords[1])
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return []
    return [
      {
        id: featureId(feature, index),
        label: featureLabel(feature),
        coords: [lng, lat] as [number, number],
      },
    ]
  })
}

export async function geocodeBest(query: string): Promise<[number, number] | null> {
  const q = query.trim()
  if (!q) return null
  try {
    const hits = await searchPlaces(q)
    return hits[0]?.coords ?? null
  } catch {
    return null
  }
}
