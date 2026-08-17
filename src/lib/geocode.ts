import type { City } from './cities'

export interface PlaceHit {
  id: string
  label: string
  secondary: string
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

function titleCase(value: string): string {
  return value
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function simplifyQuery(query: string): string {
  return query
    .replace(
      /\b(piso|pta\.?|puerta|apto\.?|apartamento|edif\.?|edificio|urb\.?|urbanización|referencia:?|preguntar por)\b[^,]*/gi,
      '',
    )
    .replace(/\s+,/g, ',')
    .replace(/,{2,}/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/^,|,$/g, '')
    .trim()
}

function withCitySuffix(query: string, city: City): string {
  const lower = query.toLowerCase()
  const suffixBits = city.geocodeSuffix.toLowerCase().split(',').map((part) => part.trim())
  if (suffixBits.some((bit) => bit && lower.includes(bit))) return query
  return `${query}, ${city.geocodeSuffix}`
}

function localHits(query: string, city: City): PlaceHit[] {
  const normalized = query.toLowerCase()
  return Object.entries(city.places)
    .filter(([key]) => normalized.includes(key))
    .map(([key, coords]) => ({
      id: `local-${city.id}-${key}`,
      label: titleCase(key),
      secondary: city.name,
      coords,
    }))
}

function featureLabel(feature: PhotonFeature, fallback: string): { label: string; secondary: string } {
  const props = feature.properties ?? {}
  const street = [props.housenumber, props.street].filter(Boolean).join(' ')
  const label = props.name?.trim() || street || 'Punto en el mapa'
  const secondary = [street !== label ? street : '', props.district, props.city, props.state]
    .filter((part, index, all) => Boolean(part) && all.indexOf(part) === index)
    .join(', ')
  return { label, secondary: secondary || fallback }
}

function featureId(feature: PhotonFeature, index: number): string {
  const props = feature.properties ?? {}
  if (props.osm_type && props.osm_id) return `${props.osm_type}-${props.osm_id}`
  return `hit-${index}`
}

function hitKey(hit: PlaceHit): string {
  return `${hit.coords[0].toFixed(5)}:${hit.coords[1].toFixed(5)}:${hit.label.toLowerCase()}`
}

async function fetchPhoton(query: string, city: City, signal?: AbortSignal): Promise<PlaceHit[]> {
  const url = new URL(PHOTON_URL)
  url.searchParams.set('q', withCitySuffix(query, city))
  url.searchParams.set('lat', String(city.center[1]))
  url.searchParams.set('lon', String(city.center[0]))
  url.searchParams.set('limit', '8')
  url.searchParams.set('lang', 'es')
  url.searchParams.set('location_bias_scale', '0.5')

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
    const { label, secondary } = featureLabel(feature, city.name)
    return [
      {
        id: featureId(feature, index),
        label,
        secondary,
        coords: [lng, lat] as [number, number],
      },
    ]
  })
}

export async function searchPlaces(
  query: string,
  city: City,
  signal?: AbortSignal,
): Promise<PlaceHit[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const simplified = simplifyQuery(q) || q
  const local = localHits(q, city)
  let remote: PlaceHit[] = []
  try {
    remote = await fetchPhoton(simplified, city, signal)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    remote = []
  }

  const seen = new Set<string>()
  const merged: PlaceHit[] = []
  for (const hit of [...local, ...remote]) {
    const key = hitKey(hit)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(hit)
  }
  return merged.slice(0, 8)
}

export async function geocodeFirst(query: string, city: City): Promise<PlaceHit | null> {
  const q = query.trim()
  if (!q) return null
  try {
    const hits = await searchPlaces(q, city)
    return hits[0] ?? null
  } catch {
    return null
  }
}
