export const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()

export const GOOGLE_MAPS_MAP_ID =
  (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? '').trim() || 'DEMO_MAP_ID'

export function hasGoogleMapsKey(): boolean {
  return GOOGLE_MAPS_API_KEY.length > 0
}

export function toLatLng(coords: [number, number]): google.maps.LatLngLiteral {
  return { lng: coords[0], lat: coords[1] }
}

export function fromLatLng(
  value: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude | null | undefined,
): [number, number] | null {
  if (!value) return null
  const lat = typeof value.lat === 'function' ? value.lat() : value.lat
  const lng = typeof value.lng === 'function' ? value.lng() : value.lng
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return [lng, lat]
}

export async function waitForMaps(signal?: AbortSignal): Promise<typeof google.maps> {
  if (!hasGoogleMapsKey()) {
    throw new Error('Falta VITE_GOOGLE_MAPS_API_KEY')
  }
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (typeof google !== 'undefined' && google.maps) {
      return google.maps
    }
    await new Promise((resolve) => window.setTimeout(resolve, 40))
  }
  throw new Error('Google Maps no cargó')
}
