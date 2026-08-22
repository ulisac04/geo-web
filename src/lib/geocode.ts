import type { City } from './cities'
import { fromLatLng, hasGoogleMapsKey, toLatLng, waitForMaps } from './mapsConfig'

export interface PlaceHit {
  id: string
  label: string
  secondary: string
  coords: [number, number]
  placeId?: string
}

export class PlacesUnavailableError extends Error {
  readonly kind = 'places_unavailable'

  constructor(message: string) {
    super(message)
    this.name = 'PlacesUnavailableError'
  }
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

function errorText(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause != null ? ` ${String(error.cause)}` : ''
    return `${error.message}${cause}`
  }
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function isPlacesBlocked(error: unknown): boolean {
  return /API_KEY_SERVICE_BLOCKED|ApiNotActivated|REQUEST_DENIED|not authorized|are blocked|PERMISSION_DENIED/i.test(
    errorText(error),
  )
}

function placesBlockedMessage(): string {
  return 'Google bloqueó Places Autocomplete en esta API key. En Cloud Console activa Places API (New) y, si la key tiene restricciones, inclúyela junto a Maps JavaScript API y Directions API.'
}

function cityBounds(city: City): google.maps.LatLngBounds {
  const [lng, lat] = city.center
  const dLat = CITY_BIAS_RADIUS_M / 111_320
  const dLng = CITY_BIAS_RADIUS_M / (111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  return new google.maps.LatLngBounds(
    { lat: lat - dLat, lng: lng - dLng },
    { lat: lat + dLat, lng: lng + dLng },
  )
}

async function fetchPlacesNew(
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

async function fetchPlacesLegacy(
  query: string,
  city: City,
  signal?: AbortSignal,
): Promise<PlaceHit[]> {
  await waitForMaps(signal)
  await google.maps.importLibrary('places')
  const service = new google.maps.places.AutocompleteService()
  const center = toLatLng(city.center)

  const response = await service.getPlacePredictions({
    input: withCitySuffix(query, city),
    language: 'es',
    componentRestrictions: { country: regionCode(city).toLowerCase() },
    locationBias: { center, radius: CITY_BIAS_RADIUS_M },
  })
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const predictions = response.predictions ?? []

  return predictions.map((prediction, index) => ({
    id: prediction.place_id || `places-legacy-${index}`,
    label: prediction.structured_formatting?.main_text || prediction.description,
    secondary: prediction.structured_formatting?.secondary_text || city.name,
    coords: city.center,
    placeId: prediction.place_id,
  }))
}

async function fetchGeocodeHits(
  query: string,
  city: City,
  signal?: AbortSignal,
): Promise<PlaceHit[]> {
  await waitForMaps(signal)
  const geocoder = new google.maps.Geocoder()
  const response = await geocoder.geocode({
    address: withCitySuffix(query, city),
    language: 'es',
    region: regionCode(city).toLowerCase(),
    componentRestrictions: { country: regionCode(city).toLowerCase() },
    bounds: cityBounds(city),
  })
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  return (response.results ?? []).flatMap((result, index) => {
    const hit = hitFromGeocodeResult(result, city, index)
    return hit ? [hit] : []
  })
}

function hitFromGeocodeResult(
  result: google.maps.GeocoderResult,
  city: City,
  index = 0,
): PlaceHit | null {
  const coords = fromLatLng(result.geometry.location)
  if (!coords) return null
  const parts = result.formatted_address.split(',').map((part) => part.trim())
  return {
    id: result.place_id || `geocode-${index}`,
    label: parts[0] || result.formatted_address,
    secondary: parts.slice(1).join(', ') || city.name,
    coords,
    placeId: result.place_id,
  }
}

export function formatPlaceHint(hit: PlaceHit): string {
  return hit.secondary ? `${hit.label}, ${hit.secondary}` : hit.label
}

export async function reverseGeocode(
  coords: [number, number],
  city: City,
  signal?: AbortSignal,
): Promise<PlaceHit | null> {
  if (!hasGoogleMapsKey()) return null
  try {
    await waitForMaps(signal)
    const geocoder = new google.maps.Geocoder()
    const response = await geocoder.geocode({
      location: toLatLng(coords),
      language: 'es',
    })
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const result = response.results[0]
    if (!result) return null
    return hitFromGeocodeResult(result, city)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return null
  }
}

async function fetchGooglePlaces(
  query: string,
  city: City,
  signal?: AbortSignal,
): Promise<PlaceHit[]> {
  const attempts = [fetchPlacesNew, fetchPlacesLegacy, fetchGeocodeHits]
  let lastError: unknown
  for (const attempt of attempts) {
    try {
      return await attempt(query, city, signal)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      lastError = error
    }
  }
  if (isPlacesBlocked(lastError)) {
    throw new PlacesUnavailableError(placesBlockedMessage())
  }
  throw new PlacesUnavailableError(
    'No se pudo buscar lugares. Revisa Maps JavaScript API, Places y Geocoding en la API key.',
  )
}

async function hydrateWithPlaceNew(
  hit: PlaceHit,
  signal?: AbortSignal,
): Promise<PlaceHit> {
  const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary
  const place = new Place({ id: hit.placeId! })
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

async function hydrateWithPlacesLegacy(
  hit: PlaceHit,
  signal?: AbortSignal,
): Promise<PlaceHit> {
  await google.maps.importLibrary('places')
  const node = document.createElement('div')
  const service = new google.maps.places.PlacesService(node)
  const details = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
    service.getDetails(
      {
        placeId: hit.placeId!,
        fields: ['geometry', 'name', 'formatted_address'],
        language: 'es',
      },
      (result, status) => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'))
          return
        }
        if (status === google.maps.places.PlacesServiceStatus.OK && result) {
          resolve(result)
          return
        }
        reject(new Error(String(status)))
      },
    )
  })
  const coords = fromLatLng(details.geometry?.location)
  if (!coords) return hit
  return {
    ...hit,
    label: details.name || hit.label,
    secondary: details.formatted_address || hit.secondary,
    coords,
  }
}

async function hydrateWithGeocoder(
  hit: PlaceHit,
  signal?: AbortSignal,
): Promise<PlaceHit> {
  const geocoder = new google.maps.Geocoder()
  const response = await geocoder.geocode({ placeId: hit.placeId })
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const result = response.results[0]
  const coords = fromLatLng(result?.geometry.location)
  if (!coords) return hit
  return {
    ...hit,
    label: result.address_components[0]?.long_name || hit.label,
    secondary: result.formatted_address || hit.secondary,
    coords,
  }
}

export async function hydratePlaceHit(
  hit: PlaceHit,
  signal?: AbortSignal,
): Promise<PlaceHit> {
  if (!hit.placeId) return hit
  await waitForMaps(signal)
  const attempts = [hydrateWithPlaceNew, hydrateWithPlacesLegacy, hydrateWithGeocoder]
  for (const attempt of attempts) {
    try {
      return await attempt(hit, signal)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
    }
  }
  return hit
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
      if (local.length === 0) throw error
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

export async function geocodeFirst(
  query: string,
  city: City,
  signal?: AbortSignal,
): Promise<PlaceHit | null> {
  const q = query.trim()
  if (!q) return null
  try {
    const hits = await searchPlaces(q, city, signal)
    const first = hits[0]
    if (!first) return null
    return hydratePlaceHit(first, signal)
  } catch {
    return null
  }
}
