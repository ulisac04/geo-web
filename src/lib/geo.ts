const EARTH_KM = 6371

export function haversineMeters(
  a: [number, number],
  b: [number, number],
): number {
  const toRad = (n: number) => (n * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 1000
}

export function etaFromMeters(meters: number): number {
  const minutes = meters / 280
  return Math.max(1, Math.round(minutes))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}
