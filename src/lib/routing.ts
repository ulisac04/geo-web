import { toLatLng, waitForMaps } from './mapsConfig'

export interface DrivingRoute {
  coordinates: [number, number][]
  distanceM: number
  durationMin: number
}

export async function fetchDrivingRoute(
  from: [number, number],
  to: [number, number],
  signal?: AbortSignal,
): Promise<DrivingRoute> {
  await waitForMaps(signal)
  const service = new google.maps.DirectionsService()
  const result = await service.route({
    origin: toLatLng(from),
    destination: toLatLng(to),
    travelMode: google.maps.TravelMode.DRIVING,
  })
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const route = result.routes[0]
  const path = route?.overview_path
  if (!route || !path?.length) {
    throw new Error('Sin ruta disponible')
  }

  let distanceM = 0
  let durationSec = 0
  for (const leg of route.legs) {
    distanceM += leg.distance?.value ?? 0
    durationSec += leg.duration?.value ?? 0
  }

  return {
    coordinates: path.map((point) => [point.lng(), point.lat()] as [number, number]),
    distanceM,
    durationMin: Math.max(1, Math.round(durationSec / 60)),
  }
}
