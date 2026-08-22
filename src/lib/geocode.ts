import type { City } from './cities'
import { fromLatLng, hasGoogleMapsKey, toLatLng, waitForMaps } from './mapsConfig'

export interface PlaceHit {
  id: string
  label: string
  secondary: string
  coords: [number, number]
  placeId?: string
}

const CITY_BIAS_RADIUS_M = 35_000

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

function regionCode(city: City): string {
  return city.country === 'Colombia' ? 'CO' : 'VE'
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

function hitKey(hit: PlaceHit): string {
  return `${hit.placeId ?? ''}:${hit.coords[0].toFixed(5)}:${hit.coords[1].toFixed(5)}:${hit.label.toLowerCase()}`
}

function predictionText(
  value: google.maps.places.FormattableText | string | null | undefined,
): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.text
}

async function fetchGooglePlaces(
  query: string,
  city: City,
  signal?: AbortSignal,
): Promise<PlaceHit[]> {
  await waitForMaps(signal)
  const { AutocompleteSuggestion } = (await google.maps.importLibrary(
    'places',
  )) as google.maps.PlacesLibrary

  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: withCitySuffix(query, city),
    language: 'es',
    region: regionCode(city),
    includedRegionCodes: [regionCode(city)],
    origin: toLatLng(city.center),
    locationBias: {
      center: toLatLng(city.center),
      radius: CITY_BIAS_RADIUS_M,
    },
  })

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  return suggestions.flatMap((suggestion, index) => {
    const prediction = suggestion.placePrediction
    if (!prediction) return []
    const label =
      predictionText(prediction.mainText) || predictionText(prediction.text) || 'Punto en el mapa'
    const secondary = predictionText(prediction.secondaryText) || city.name
    return [
      {
        id: prediction.placeId || `places-${index}`,
        label,
        secondary,
        coords: city.center,
        placeId: prediction.placeId,
      },
    ]
  })
}

export async function hydratePlaceHit(
  hit: PlaceHit,
  signal?: AbortSignal,
): Promise<PlaceHit> {
  if (!hit.placeId) return hit
  await waitForMaps(signal)
  const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary
  const place = new Place({ id: hit.placeId })
  await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress'] })
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const coords = fromLatLng(place.location)
  if (!coords) return hit
  return {
    ...hit,
    label: place.displayName || hit.label,
    secondary: place.formattedAddress || hit.secondary,
    coords,
  }
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
  if (hasGoogleMapsKey()) {
    try {
      remote = await fetchGooglePlaces(simplified, city, signal)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      remote = []
    }
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
    const first = hits[0]
    if (!first) return null
    return hydratePlaceHit(first)
  } catch {
    return null
  }
}
