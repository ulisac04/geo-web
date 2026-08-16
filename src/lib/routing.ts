export interface DrivingRoute {
  coordinates: [number, number][]
  distanceM: number
  durationMin: number
}

interface OsrmRouteResponse {
  routes?: Array<{
    distance: number
    duration: number
    geometry?: { coordinates?: [number, number][] }
  }>
}

export async function fetchDrivingRoute(
  from: [number, number],
  to: [number, number],
  signal?: AbortSignal,
): Promise<DrivingRoute> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from[0]},${from[1]};${to[0]},${to[1]}` +
    `?overview=full&geometries=geojson`

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error('No se pudo calcular la ruta')
  }

  const data = (await response.json()) as OsrmRouteResponse
  const route = data.routes?.[0]
  const coordinates = route?.geometry?.coordinates
  if (!route || !coordinates?.length) {
    throw new Error('Sin ruta disponible')
  }

  return {
    coordinates,
    distanceM: route.distance,
    durationMin: Math.max(1, Math.round(route.duration / 60)),
  }
}
